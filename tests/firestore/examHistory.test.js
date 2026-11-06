import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  runTransaction,
  query,
  limit,
} from 'firebase/firestore';
import { createExamHistoryRepository } from '../../src/services/examHistoryRepository.js';
import { createCustomQuizService } from '../../src/services/customQuizRepository.js';
import { createCustomCandidate, cloudQuizId } from '../../src/utils/customQuizModel.js';
import { examHistorySource } from '../../src/utils/examHistory.js';
import { createHistorySourceReader } from '../../src/services/examHistorySource.js';
import { EXAM_HISTORY_LIMIT, MAX_HISTORY_PAYLOAD_BYTES } from '../../src/data/examHistoryLimits.js';
import { historyAttempt, historyQuestions } from '../fixtures/historyAttempt.js';

assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.equal(process.env.GCLOUD_PROJECT, 'demo-quiz-app');
let env;
const client = (uid = 'alice') =>
  uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore();
const repository = (uid = 'alice', options) => createExamHistoryRepository(client(uid), options);
const path = (collection, id, uid = 'alice') => `users/${uid}/${collection}/${id}`;
const refs = (db, id) => ({
  summary: doc(db, path('examAttempts', id)),
  snapshot: doc(db, path('examAttemptSnapshots', id)),
  receipt: doc(db, path('examAttemptReceipts', id)),
  quota: doc(db, path('examHistoryState', 'quota')),
});
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-quiz-app',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: await fs.readFile(new URL('../../firebase/firestore.rules', import.meta.url), 'utf8'),
    },
  });
});
beforeEach(async () => env.clearFirestore());
after(async () => env?.cleanup());

function rawCreate(
  db,
  attempt,
  {
    quota = { count: 1, revision: 1 },
    omit = null,
    summary = {},
    snapshot = {},
    receipt = {},
    state = {},
  } = {}
) {
  const targets = refs(db, attempt.summary.attemptId),
    batch = writeBatch(db);
  if (omit !== 'summary')
    batch.set(targets.summary, { ...attempt.summary, createdAt: serverTimestamp(), ...summary });
  if (omit !== 'snapshot')
    batch.set(targets.snapshot, { ...attempt.snapshot, createdAt: serverTimestamp(), ...snapshot });
  if (omit !== 'receipt')
    batch.set(targets.receipt, {
      state: 'saved',
      payloadHash: attempt.summary.payloadHash,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...receipt,
    });
  if (omit !== 'quota')
    batch.set(targets.quota, {
      ...quota,
      attemptId: attempt.summary.attemptId,
      operation: 'create',
      updatedAt: serverTimestamp(),
      ...state,
    });
  return batch.commit();
}

test('owner atomic create/review/delete preserves profiles and removes complete content with a minimal receipt', async () => {
  const db = client(),
    service = createExamHistoryRepository(db),
    attempt = await historyAttempt();
  await setDoc(doc(db, 'users/alice'), {
    quizProgress: { 'gcp-ace': { questionIndex: 3 } },
    llmProviders: { gemini: { apiKey: 'fixture-only' } },
  });
  await service.save('alice', attempt);
  const saved = await service.get('alice', attempt.summary.attemptId);
  assert.equal(saved.summary.correct, 1);
  assert.equal(saved.payload.questions[0].id, 'history-fixture');
  const targets = refs(db, attempt.summary.attemptId);
  assert.equal((await getDoc(targets.quota)).data().count, 1);
  await service.remove('alice', attempt.summary.attemptId);
  assert.equal((await getDoc(targets.summary)).exists(), false);
  assert.equal((await getDoc(targets.snapshot)).exists(), false);
  const receipt = (await getDoc(targets.receipt)).data();
  assert.deepEqual(Object.keys(receipt).sort(), ['createdAt', 'deletedAt', 'state']);
  assert.equal(receipt.state, 'deleted');
  assert.equal((await getDoc(targets.quota)).data().count, 0);
  assert.equal(
    (await getDoc(doc(db, 'users/alice'))).data().quizProgress['gcp-ace'].questionIndex,
    3
  );
  await service.remove('alice', attempt.summary.attemptId);
  assert.equal((await getDoc(targets.quota)).data().count, 0);
});

test('owner metadata pages are bounded while Bob and guest cannot read or mutate archives/quota/receipts', async () => {
  const attempt = await historyAttempt();
  await repository().save('alice', attempt);
  for (const actor of ['bob', null]) {
    const db = client(actor),
      targets = refs(db, attempt.summary.attemptId);
    for (const target of Object.values(targets)) {
      await assertFails(getDoc(target));
      await assertFails(deleteDoc(target));
    }
    await assertFails(getDocs(query(collection(db, 'users/alice/examAttempts'), limit(20))));
    await assertFails(rawCreate(db, await historyAttempt()));
  }
  const db = client();
  await assertFails(getDocs(collection(db, 'users/alice/examAttempts')));
  await assertFails(getDocs(query(collection(db, 'users/alice/examAttempts'), limit(21))));
  await assertFails(getDocs(query(collection(db, 'users/alice/examAttemptSnapshots'), limit(20))));
  await assertFails(getDocs(query(collection(db, 'users/alice/examAttemptReceipts'), limit(20))));
  await assertSucceeds(getDocs(query(collection(db, 'users/alice/examAttempts'), limit(20))));
});

test('concurrent duplicates and a lost commit response are idempotent, conflicting payloads remain immutable', async () => {
  const attempt = await historyAttempt(),
    a = repository(),
    b = repository();
  await Promise.all([a.save('alice', attempt), b.save('alice', attempt)]);
  const targets = refs(client(), attempt.summary.attemptId);
  assert.equal((await getDoc(targets.quota)).data().count, 1);
  const changed = await historyAttempt({ id: attempt.summary.attemptId, now: 2000 });
  await assert.rejects(a.save('alice', changed), { code: 'HISTORY_CONFLICT' });
  let lose = true;
  const flaky = repository('alice', {
    transact: async (db, operation) => {
      const result = await runTransaction(db, operation);
      if (lose) {
        lose = false;
        throw Object.assign(new Error('Synthetic lost response'), { code: 'unavailable' });
      }
      return result;
    },
  });
  const second = await historyAttempt();
  await assert.rejects(flaky.save('alice', second), { code: 'HISTORY_NETWORK' });
  await flaky.save('alice', second);
  assert.equal((await getDoc(targets.quota)).data().count, 2);
});

test('independent concurrent attempts consume their actual slots and concurrent deletion decrements each only once', async () => {
  const service = repository(),
    attempts = await Promise.all([historyAttempt(), historyAttempt(), historyAttempt()]);
  await Promise.all(attempts.map((attempt) => service.save('alice', attempt)));
  assert.equal((await service.state('alice')).count, 3);
  await Promise.all([
    service.remove('alice', attempts[0].summary.attemptId),
    repository().remove('alice', attempts[0].summary.attemptId),
  ]);
  assert.equal((await service.state('alice')).count, 2);
});

test('deleted attempts cannot resurrect from stale save/retry and receipts or quota cannot be reset', async () => {
  const service = repository(),
    attempt = await historyAttempt();
  await service.save('alice', attempt);
  await service.remove('alice', attempt.summary.attemptId);
  await assert.rejects(service.save('alice', attempt), { code: 'HISTORY_DELETED' });
  const targets = refs(client(), attempt.summary.attemptId);
  await assertFails(deleteDoc(targets.receipt));
  await assertFails(deleteDoc(targets.quota));
  await assertFails(
    setDoc(targets.receipt, {
      state: 'saved',
      payloadHash: attempt.summary.payloadHash,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(rawCreate(client(), attempt, { quota: { count: 1, revision: 3 } }));
  assert.equal((await getDoc(targets.summary)).exists(), false);
  assert.equal((await getDoc(targets.snapshot)).exists(), false);
  assert.equal((await getDoc(targets.quota)).data().count, 0);
  const next = await historyAttempt();
  await service.save('alice', next);
  assert.equal((await getDoc(targets.quota)).data().count, 1);
});

test('direct SDK orphan pairs, forged quota/grade/source/schema and immutable updates are rejected', async () => {
  for (const omit of ['summary', 'snapshot', 'receipt', 'quota'])
    await assertFails(rawCreate(client(), await historyAttempt(), { omit }));
  for (const patch of [
    { summary: { extra: 'forbidden' } },
    { snapshot: { extra: 'forbidden' } },
    { receipt: { extra: 'forbidden' } },
    { state: { extra: 'forbidden' } },
    { summary: { passed: false } },
    { summary: { questionCount: 101 } },
    { summary: { correct: -1 } },
    { summary: { source: { ...(await historyAttempt()).summary.source, kind: 'upload' } } },
    { snapshot: { payloadHash: 'a'.repeat(64) } },
    { quota: { count: 0, revision: 1 } },
    { quota: { count: 1, revision: 0 } },
  ])
    await assertFails(rawCreate(client(), await historyAttempt(), patch));
  const attempt = await historyAttempt();
  await repository().save('alice', attempt);
  const targets = refs(client(), attempt.summary.attemptId);
  await assertFails(updateDoc(targets.summary, { correct: 0, incorrect: 1, passed: false }));
  await assertFails(updateDoc(targets.snapshot, { payload: '{}' }));
  await assertFails(
    updateDoc(targets.quota, {
      count: 0,
      revision: 2,
      attemptId: attempt.summary.attemptId,
      operation: 'delete',
      updatedAt: serverTimestamp(),
    })
  );
  await assertFails(deleteDoc(targets.summary));
  await assertFails(deleteDoc(targets.snapshot));
});

test('Rules enforce UTF-8 payload bytes, not just character count', async () => {
  const attempt = await historyAttempt();
  await assertFails(
    rawCreate(client(), attempt, {
      snapshot: { payload: '€'.repeat(Math.ceil(MAX_HISTORY_PAYLOAD_BYTES / 3) + 1) },
    })
  );
  assert.equal((await getDoc(refs(client(), attempt.summary.attemptId).quota)).exists(), false);
});

async function seed(count) {
  const attempts = await Promise.all(
    Array.from({ length: count }, (_, index) =>
      historyAttempt({ now: 1000 + Math.floor(index / 3) })
    )
  );
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore(),
      batch = writeBatch(db);
    for (const attempt of attempts) {
      const target = refs(db, attempt.summary.attemptId);
      batch.set(target.summary, { ...attempt.summary, createdAt: serverTimestamp() });
      batch.set(target.snapshot, { ...attempt.snapshot, createdAt: serverTimestamp() });
      batch.set(target.receipt, {
        state: 'saved',
        payloadHash: attempt.summary.payloadHash,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    batch.set(refs(db, attempts[0].summary.attemptId).quota, {
      count,
      revision: count,
      attemptId: attempts.at(-1).summary.attemptId,
      operation: 'create',
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  });
  return attempts;
}

test(
  'two contenders for slot 50 produce one winner; existing identical saves remain readable/idempotent at capacity',
  { timeout: 60000 },
  async () => {
    const attempts = await seed(EXAM_HISTORY_LIMIT - 1),
      a = repository(),
      b = repository();
    const contenders = await Promise.all([historyAttempt(), historyAttempt()]);
    const result = await Promise.allSettled([
      a.save('alice', contenders[0]),
      b.save('alice', contenders[1]),
    ]);
    assert.equal(result.filter((row) => row.status === 'fulfilled').length, 1);
    assert.equal(result.find((row) => row.status === 'rejected').reason.code, 'HISTORY_QUOTA');
    assert.equal(
      (await getDoc(refs(client(), attempts[0].summary.attemptId).quota)).data().count,
      50
    );
    await a.save('alice', attempts[0]);
    await assert.rejects(a.save('alice', await historyAttempt()), { code: 'HISTORY_QUOTA' });
  }
);

test('real SDK metadata pagination is stable at equal end times and never fetches snapshot collections', async () => {
  const attempts = await seed(45),
    service = repository();
  let after = null;
  const rows = [];
  const sizes = [];
  do {
    const page = await service.listPage('alice', after);
    rows.push(...page.summaries);
    sizes.push(page.summaries.length);
    after = page.next;
  } while (after);
  assert.deepEqual(sizes, [20, 20, 5]);
  assert.equal(new Set(rows.map((row) => row.attemptId)).size, 45);
  const sorted = attempts
    .map((attempt) => attempt.summary)
    .sort((a, b) => b.endedAt - a.endedAt || (a.attemptId > b.attemptId ? -1 : 1));
  assert.deepEqual(
    rows.map((row) => row.attemptId),
    sorted.map((row) => row.attemptId)
  );
  assert.ok(
    rows.every((row) => !Object.hasOwn(row, 'questions') && !Object.hasOwn(row, 'payload'))
  );
});

test('private archive creation rechecks source instance/version; old snapshots survive source replacement/deletion/reuse', async () => {
  const db = client(),
    custom = createCustomQuizService(db),
    history = createExamHistoryRepository(db),
    candidate = createCustomCandidate('Private fixture', historyQuestions);
  const sourceStatus = createHistorySourceReader(db);
  await custom.create('alice', candidate);
  let saved = (await custom.list('alice'))[0];
  const source = examHistorySource(
    {
      ...saved,
      id: cloudQuizId(saved.slotId, saved.instanceId),
      kind: 'cloud-custom',
      name: saved.title || saved.name,
      owner: 'alice',
    },
    'alice'
  );
  const attempt = await historyAttempt({ source });
  await history.save('alice', attempt);
  assert.equal((await sourceStatus('alice', attempt.summary.source)).state, 'current');
  await custom.replace('alice', saved, {
    title: 'Replaced fixture',
    questions: [{ ...historyQuestions[0], question: 'Changed question' }],
  });
  await history.save('alice', attempt);
  assert.equal((await sourceStatus('alice', attempt.summary.source)).state, 'changed');
  const stale = await historyAttempt({ source });
  await assert.rejects(history.save('alice', stale), { code: 'HISTORY_SOURCE_CHANGED' });
  await assertFails(rawCreate(db, stale, { quota: { count: 2, revision: 2 } }));
  saved = (await custom.list('alice'))[0];
  await custom.remove('alice', saved);
  assert.equal((await sourceStatus('alice', attempt.summary.source)).state, 'missing');
  await custom.create('alice', createCustomCandidate('New slot occupant', historyQuestions));
  assert.equal((await sourceStatus('alice', attempt.summary.source)).state, 'replaced');
  assert.equal(
    (await history.get('alice', attempt.summary.attemptId)).payload.questions[0].question,
    historyQuestions[0].question
  );
  await assert.rejects(history.save('alice', await historyAttempt({ source })), {
    code: 'HISTORY_SOURCE_CHANGED',
  });
});
