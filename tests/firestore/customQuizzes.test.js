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
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { createCustomQuizService } from '../../src/services/customQuizRepository.js';
import { createCustomCandidate } from '../../src/utils/customQuizModel.js';
import { CUSTOM_QUIZ_SLOTS, MAX_CUSTOM_QUIZ_BYTES } from '../../src/data/customQuizLimits.js';

assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.equal(process.env.GCLOUD_PROJECT, 'demo-quiz-app');
let env;
const db = (uid = 'alice') => env.authenticatedContext(uid).firestore();
const service = (uid = 'alice') => createCustomQuizService(db(uid));
const question = {
  id: 'q1',
  question: 'Pick A',
  options: { A: 'First', B: 'Second' },
  answer: ['A'],
};
const input = (title = 'Example') => createCustomCandidate(title, [question]);
const value = (patch = {}) => ({
  ...input(),
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...patch,
});
const path = (slot = 'slot-1') => `users/alice/customQuizzes/${slot}`;
const list = (s) => s.list('alice');

before(async () => {
  const rules = await fs.readFile(
    new URL('../../firebase/firestore.rules', import.meta.url),
    'utf8'
  );
  env = await initializeTestEnvironment({
    projectId: 'demo-quiz-app',
    firestore: { host: '127.0.0.1', port: 8080, rules },
  });
});
beforeEach(async () => env.clearFirestore());
after(async () => env?.cleanup());

test('candidate Rules preserve the existing private profile and bank-checkpoint contract', async () => {
  const owner = db(),
    stranger = db('bob'),
    guest = env.unauthenticatedContext().firestore();
  const profile = doc(owner, 'users/alice');
  await assertSucceeds(
    setDoc(profile, {
      llmProviders: { gemini: { apiKey: 'fixture' } },
      quizProgress: { bank: { questionIndex: 5 } },
    })
  );
  await assertSucceeds(updateDoc(profile, { displayName: 'Alice' }));
  assert.equal((await getDoc(profile)).data().quizProgress.bank.questionIndex, 5);
  for (const client of [stranger, guest]) {
    await assertFails(getDoc(doc(client, 'users/alice')));
    await assertFails(updateDoc(doc(client, 'users/alice'), { displayName: 'Other' }));
    await assertFails(getDocs(collection(client, 'users')));
  }
  await assertFails(
    setDoc(doc(owner, 'users/alice/customQuizzes/slot-1/unknown/child'), { value: 1 })
  );
  await assertSucceeds(deleteDoc(profile));
});

test('all supported formats round-trip through the real SDK and validate on read', async () => {
  const s = service();
  for (const format of ['single', 'multiple', 'yes-no', 'dropdown-rows', 'dropdown-inline']) {
    const questions = JSON.parse(
      await fs.readFile(
        new URL(`../../public/examples/quiz-${format}.json`, import.meta.url),
        'utf8'
      )
    );
    await s.create('alice', createCustomCandidate(format, questions));
    const saved = (await list(s))[0];
    assert.equal(saved.invalid, undefined);
    assert.deepEqual(saved.questions, questions);
    await s.remove('alice', saved);
  }
});

test('only the owner can list/read/create/update/delete custom quizzes', async () => {
  const alice = db(),
    bob = db('bob'),
    guest = env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(alice, path()), value()));
  assert.equal(
    (await assertSucceeds(getDocs(collection(alice, 'users/alice/customQuizzes')))).size,
    1
  );
  for (const client of [bob, guest]) {
    await assertFails(getDoc(doc(client, path())));
    await assertFails(getDocs(collection(client, 'users/alice/customQuizzes')));
    await assertFails(setDoc(doc(client, path('slot-2')), value()));
    await assertFails(updateDoc(doc(client, path()), { title: 'Stolen' }));
    await assertFails(deleteDoc(doc(client, path())));
  }
  await assertSucceeds(deleteDoc(doc(alice, path())));
});

test('three explicit slots enforce quota even through direct SDK requests', async () => {
  const client = db();
  for (const slot of CUSTOM_QUIZ_SLOTS)
    await assertSucceeds(setDoc(doc(client, path(slot)), value()));
  for (const slot of ['slot-0', 'slot-4', 'arbitrary'])
    await assertFails(setDoc(doc(client, path(slot)), value()));
  const s = service();
  await assert.rejects(s.create('alice', input()), { code: 'CUSTOM_QUOTA' });
  const existing = (await list(s))[0];
  await s.remove('alice', existing);
  await s.create('alice', input('After deletion'));
  assert.equal((await list(s)).length, 3);
});

test('Rules reject forged counts, missing/extra fields, types and versions', async () => {
  const client = db();
  for (const patch of [
    { questions: [], questionCount: 0 },
    { questions: Array.from({ length: 101 }, () => question), questionCount: 1 },
    { questionCount: 2 },
    { questionCount: '1' },
    { questions: {} },
    { title: '' },
    { title: 'x'.repeat(161) },
    { instanceId: 'bad' },
    { public: true },
    { revision: 2 },
    { contentVersion: 2 },
    { createdAt: 100 },
    { updatedAt: 100 },
    { checkpoint: {} },
  ])
    await assertFails(setDoc(doc(client, path()), value(patch)));
  const missing = value();
  delete missing.questions;
  await assertFails(setDoc(doc(client, path()), missing));
  await assertSucceeds(
    setDoc(
      doc(client, path()),
      value({
        questions: Array.from({ length: 100 }, (_, id) => ({ ...question, id })),
        questionCount: 100,
      })
    )
  );
});

test(
  'concurrent contenders for the last slot never overwrite a winner',
  { timeout: 60000 },
  async () => {
    const first = service(),
      second = service();
    await first.create('alice', input('First'));
    await first.create('alice', input('Second'));
    const results = await Promise.allSettled([
      first.create('alice', input('Contender A')),
      second.create('alice', input('Contender B')),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(results.find((r) => r.status === 'rejected').reason.code, 'CUSTOM_QUOTA');
    assert.equal((await list(first)).length, 3);
  }
);

test(
  'same operation after a lost response remains idempotent including concurrent retries',
  { timeout: 60000 },
  async () => {
    const a = service(),
      b = service(),
      candidate = input('Retry');
    const slots = await Promise.all([a.create('alice', candidate), b.create('alice', candidate)]);
    assert.equal(slots[0], slots[1]);
    assert.equal(await a.create('alice', candidate), slots[0]);
    assert.equal((await list(a)).length, 1);
    const returnedOnAnotherClient = (await b.list('alice'))[0];
    assert.deepEqual(returnedOnAnotherClient.questions, candidate.questions);
    assert.equal(returnedOnAnotherClient.title, candidate.title);
    await assert.rejects(a.create('alice', { ...candidate, title: 'Changed after commit' }), {
      code: 'CUSTOM_CONFLICT',
    });
  }
);

test('rename preserves content/checkpoint; replacement resets only that quiz and stale mutations fail', async () => {
  const s = service();
  await setDoc(doc(db(), 'users/alice'), {
    quizProgress: { 'aws-saa': { questionIndex: 3 } },
    llmProviders: { gemini: { apiKey: 'fixture' } },
  });
  await s.create('alice', input());
  let quiz = (await list(s))[0];
  await s.checkpoint('alice', quiz, 0, 'q1');
  quiz = (await list(s))[0];
  await s.rename('alice', quiz, 'Renamed');
  const renamed = (await list(s))[0];
  assert.deepEqual(renamed.questions, quiz.questions);
  assert.deepEqual(renamed.checkpoint, quiz.checkpoint);
  assert.equal(renamed.instanceId, quiz.instanceId);
  assert.equal(renamed.contentVersion, quiz.contentVersion);
  await s.checkpoint('alice', quiz, 0, 'q1'); // older metadata revision is safe
  await assert.rejects(s.rename('alice', quiz, 'Stale'), { code: 'CUSTOM_CONFLICT' });
  await s.replace('alice', renamed, input('Replaced'));
  const replaced = (await list(s))[0];
  assert.equal(replaced.contentVersion, 2);
  assert.equal(replaced.checkpoint, null);
  await assert.rejects(s.checkpoint('alice', quiz, 0, 'q1'), { code: 'CUSTOM_CONFLICT' });
  await assert.rejects(s.remove('alice', quiz), { code: 'CUSTOM_CONFLICT' });
  await s.remove('alice', replaced);
  await s.create('alice', input('New occupant'));
  for (const action of [
    () => s.rename('alice', replaced, 'Stale'),
    () => s.replace('alice', replaced, input()),
    () => s.remove('alice', replaced),
    () => s.checkpoint('alice', replaced, 0, 'q1'),
  ])
    await assert.rejects(action(), { code: 'CUSTOM_CONFLICT' });
  assert.equal((await list(s))[0].title, 'New occupant');
  assert.equal(
    (await getDoc(doc(db(), 'users/alice'))).data().quizProgress['aws-saa'].questionIndex,
    3
  );
});

test('Rules prevent content edits without version/reset and checkpoint forgery', async () => {
  const client = db(),
    s = createCustomQuizService(client);
  await s.create('alice', input());
  const quiz = (await list(s))[0],
    target = doc(client, path());
  for (const patch of [
    { questions: [{ ...question, question: 'Changed' }], revision: 2 },
    { instanceId: crypto.randomUUID() },
    { createdAt: serverTimestamp() },
    { title: 'No revision' },
    { revision: 999 },
    {
      checkpoint: {
        instanceId: crypto.randomUUID(),
        contentVersion: 1,
        questionIndex: 0,
        questionId: 'q1',
        savedAt: serverTimestamp(),
      },
    },
    {
      checkpoint: {
        instanceId: quiz.instanceId,
        contentVersion: 2,
        questionIndex: 0,
        questionId: 'q1',
        savedAt: serverTimestamp(),
      },
    },
    {
      checkpoint: {
        instanceId: quiz.instanceId,
        contentVersion: 1,
        questionIndex: 100,
        questionId: 'q1',
        savedAt: serverTimestamp(),
      },
    },
  ])
    await assertFails(updateDoc(target, { ...patch, updatedAt: serverTimestamp() }));
});

test('document budget allows large valid content; the server rejects documents over 1 MiB', async () => {
  const s = service();
  const large = input();
  large.questions[0].explanation = 'x'.repeat(MAX_CUSTOM_QUIZ_BYTES - 2000);
  await s.create('alice', large);
  assert.equal((await list(s)).length, 1);
  await assert.rejects(
    setDoc(
      doc(db(), path('slot-2')),
      value({ questions: [{ ...question, explanation: 'x'.repeat(1024 * 1024) }] })
    ),
    { code: 'invalid-argument' }
  );
});
