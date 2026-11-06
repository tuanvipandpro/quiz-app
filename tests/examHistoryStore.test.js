import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createExamCaptureStore } from '../src/services/examCaptureStore.js';
import { createExamHistoryStore } from '../src/services/examHistoryStore.js';
import { createExamSession, finishExam } from '../src/utils/studySession.js';
import { examHistorySource, retainedHistoryStats } from '../src/utils/examHistory.js';
import { historyError } from '../src/utils/examHistoryErrors.js';
import { decodeHistorySnapshot } from '../src/utils/examHistorySnapshot.js';
import { historyAttempt, historyQuestions } from './fixtures/historyAttempt.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const source = examHistorySource({ kind: 'bank', id: 'gcp-ace' }, 'alice');
const terminal = (patch = {}) =>
  finishExam(
    createExamSession(historyQuestions, 1, 60, {
      now: 1000,
      historyOwner: 'alice',
      historySource: source,
      captureHistory: true,
      ...patch,
    }),
    2000,
    true
  );

test('capture never writes disabled, guest, unsaved-upload, running or old completed results', async () => {
  let calls = 0;
  const store = createExamCaptureStore({
    save() {
      calls++;
    },
  });
  for (const [uid, enabled, session] of [
    ['alice', false, terminal()],
    [null, true, terminal({ historyOwner: null })],
    ['alice', true, terminal({ historySource: null })],
    ['alice', true, createExamSession(historyQuestions, 1, 60)],
    ['alice', true, { ...terminal(), captureHistory: false }],
  ]) {
    store.activate(uid, enabled);
    await store.capture(session, historyQuestions);
  }
  assert.equal(calls, 0);
});

test('same-ID capture deduplicates rerenders, shows truthful retry state and never treats a deleted receipt as saved', async () => {
  const ids = [],
    store = createExamCaptureStore({
      async save(uid, attempt) {
        ids.push(attempt.summary.attemptId);
        if (ids.length === 1) throw historyError('NETWORK');
        return attempt.summary;
      },
    });
  const session = terminal();
  store.activate('alice', true);
  await store.capture(session, historyQuestions);
  assert.equal(store.getSnapshot().status, 'error');
  await store.capture(session, historyQuestions);
  assert.equal(ids.length, 1);
  await store.capture(session, historyQuestions, { retry: true });
  assert.deepEqual(ids, [session.attemptId, session.attemptId]);
  assert.equal(store.getSnapshot().status, 'saved');
  await store.capture({ ...session, index: 0 }, historyQuestions);
  assert.equal(ids.length, 2);
  const deleted = createExamCaptureStore({
    async save() {
      throw historyError('DELETED');
    },
  });
  deleted.activate('alice', true);
  await deleted.capture(session, historyQuestions);
  assert.equal(deleted.getSnapshot().status, 'deleted');
  assert.equal(deleted.getSnapshot().summary, null);
});

test('StrictMode-like prepare cleanup and stale save completion cannot write/display data under a new owner', async () => {
  const session = terminal(),
    attempt = await historyAttempt({ id: session.attemptId });
  const preparation = deferred(),
    writes = [];
  const store = createExamCaptureStore(
    {
      async save(uid, attempt) {
        writes.push(uid);
        return attempt.summary;
      },
    },
    { prepare: () => preparation.promise }
  );
  store.activate('alice', true);
  const first = store.capture(session, historyQuestions);
  store.activate(null, false);
  store.activate('alice', true);
  const second = store.capture(session, historyQuestions);
  preparation.resolve(attempt);
  await Promise.all([first, second]);
  assert.deepEqual(writes, ['alice']);
  const response = deferred(),
    late = createExamCaptureStore({ save: () => response.promise });
  late.activate('alice', true);
  const pending = late.capture(session, historyQuestions);
  await new Promise((resolve) => setImmediate(resolve));
  late.activate('bob', true);
  response.resolve(attempt.summary);
  await pending;
  assert.equal(late.getSnapshot().uid, 'bob');
  assert.equal(late.getSnapshot().summary, null);
  await late.capture(session, historyQuestions, { retry: true });
  assert.equal(late.getSnapshot().attemptId, null);
});

test('a missing service response cannot create fake saved state', async () => {
  const store = createExamCaptureStore({
    async save() {
      return undefined;
    },
  });
  store.activate('alice', true);
  await store.capture(terminal(), historyQuestions);
  assert.equal(store.getSnapshot().status, 'error');
  assert.equal(store.getSnapshot().error.code, 'HISTORY_INVALID');
});

async function listFixture(count = 25) {
  const attempts = await Promise.all(
    Array.from({ length: count }, (_, index) => historyAttempt({ now: 1000 + index }))
  );
  const rows = attempts.map((attempt) => attempt.summary).sort((a, b) => b.endedAt - a.endedAt);
  const calls = { pages: 0, payloads: 0 };
  let fail = false,
    revision = 1;
  return {
    rows,
    calls,
    setFail: (value) => {
      fail = value;
    },
    bump: () => revision++,
    service: {
      async state() {
        return { count: rows.length, revision };
      },
      async listPage(uid, after) {
        calls.pages++;
        if (fail && after) throw historyError('NETWORK');
        const start = after ? rows.findIndex((row) => row.attemptId === after.attemptId) + 1 : 0;
        const page = rows.slice(start, start + 20),
          last = page.at(-1);
        return {
          summaries: page,
          next: page.length === 20 ? { attemptId: last.attemptId, endedAt: last.endedAt } : null,
        };
      },
      async get(uid, id) {
        calls.payloads++;
        const attempt = attempts.find((attempt) => attempt.summary.attemptId === id);
        return {
          summary: attempt.summary,
          payload: await decodeHistorySnapshot(attempt.summary, attempt.snapshot),
        };
      },
      async sourceStatus() {
        return { state: 'current' };
      },
      async remove(uid, id) {
        const index = rows.findIndex((row) => row.attemptId === id);
        if (index >= 0) {
          rows.splice(index, 1);
          revision++;
        }
      },
    },
  };
}

test('history gathers real pages for complete retained statistics, separately from payload reads', async () => {
  const fixture = await listFixture(),
    store = createExamHistoryStore(fixture.service);
  store.activate('alice', true);
  await store.reload();
  assert.equal(store.getSnapshot().summaries.length, 25);
  assert.equal(retainedHistoryStats(store.getSnapshot().summaries)[0].count, 25);
  assert.equal(fixture.calls.pages, 2);
  assert.equal(fixture.calls.payloads, 0);
  await store.read(fixture.rows[0].attemptId);
  assert.equal(fixture.calls.payloads, 1);
  assert.equal(store.getSnapshot().sourceStatus.state, 'current');
});

test('a partial-page outage exposes no partial totals and a reload recovers', async () => {
  const fixture = await listFixture(),
    store = createExamHistoryStore(fixture.service);
  fixture.setFail(true);
  store.activate('alice', true);
  await store.reload();
  assert.equal(store.getSnapshot().error.code, 'HISTORY_NETWORK');
  assert.deepEqual(store.getSnapshot().summaries, []);
  fixture.setFail(false);
  await store.reload();
  assert.equal(store.getSnapshot().summaries.length, 25);
});

test('a moving metadata revision is reconciled before publishing statistics', async () => {
  const fixture = await listFixture(1);
  let stateReads = 0;
  const service = {
    ...fixture.service,
    async state() {
      stateReads++;
      return { count: 1, revision: stateReads === 1 ? 1 : 2 };
    },
  };
  const store = createExamHistoryStore(service);
  store.activate('alice', true);
  await store.reload();
  assert.equal(stateReads, 4);
  assert.equal(store.getSnapshot().summaries.length, 1);
});

test('a malformed empty next page cannot loop forever or publish fake statistics', async () => {
  let calls = 0;
  const store = createExamHistoryStore({
    async state() {
      return { count: 0, revision: 0 };
    },
    async listPage() {
      calls++;
      return { summaries: [], next: { attemptId: 'invalid' } };
    },
  });
  store.activate('alice', true);
  await store.reload();
  assert.equal(calls, 1);
  assert.equal(store.getSnapshot().error.code, 'HISTORY_INVALID');
});

test('late list, payload and source-status reads are discarded across accounts and route identities', async () => {
  const fixture = await listFixture(2),
    list = deferred();
  const store = createExamHistoryStore({ ...fixture.service, listPage: () => list.promise });
  store.activate('alice', true);
  const pending = store.reload();
  await new Promise((resolve) => setImmediate(resolve));
  store.activate('bob', true);
  list.resolve({ summaries: fixture.rows, next: null });
  await pending;
  assert.deepEqual(store.getSnapshot().summaries, []);
  const a = deferred(),
    b = deferred(),
    status = deferred(),
    reader = createExamHistoryStore({
      ...fixture.service,
      get: (uid, id) => (id === fixture.rows[0].attemptId ? a.promise : b.promise),
      sourceStatus: () => status.promise,
    });
  reader.activate('alice', true);
  const first = reader.read(fixture.rows[0].attemptId),
    second = reader.read(fixture.rows[1].attemptId);
  a.resolve({ summary: fixture.rows[0], payload: {} });
  b.resolve({ summary: fixture.rows[1], payload: {} });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(reader.getSnapshot().record.summary.attemptId, fixture.rows[1].attemptId);
  reader.activate('bob', true);
  status.resolve({ state: 'changed' });
  await Promise.all([first, second]);
  assert.equal(reader.getSnapshot().record, null);
  assert.equal(reader.getSnapshot().sourceStatus, null);
});

test('source failure preserves the archive, deletion failure preserves rows and owner change discards late deletion UI', async () => {
  const fixture = await listFixture(1),
    store = createExamHistoryStore({
      ...fixture.service,
      async sourceStatus() {
        throw historyError('NETWORK');
      },
      async remove() {
        throw historyError('PERMISSION');
      },
    });
  store.activate('alice', true);
  await store.reload();
  await store.read(fixture.rows[0].attemptId);
  assert.ok(store.getSnapshot().record);
  assert.equal(store.getSnapshot().sourceStatus.state, 'unavailable');
  await assert.rejects(store.remove(fixture.rows[0].attemptId), { code: 'HISTORY_PERMISSION' });
  assert.equal(store.getSnapshot().summaries.length, 1);
  const delayed = deferred(),
    late = createExamHistoryStore({ ...fixture.service, remove: () => delayed.promise });
  late.activate('alice', true);
  const result = late.remove(fixture.rows[0].attemptId);
  late.activate('bob', true);
  delayed.resolve();
  await assert.rejects(result, { code: 'HISTORY_SESSION_CHANGED' });
  assert.equal(late.getSnapshot().pending, null);
});

test('disabled and guest stores perform no private read or deletion', async () => {
  let reads = 0;
  const service = {
    state() {
      reads++;
    },
    get() {
      reads++;
    },
    remove() {
      reads++;
    },
  };
  const store = createExamHistoryStore(service);
  for (const [uid, enabled] of [
    [null, true],
    ['alice', false],
  ]) {
    store.activate(uid, enabled);
    await store.reload();
    await store.read('anything');
    await assert.rejects(store.remove('anything'), { code: 'HISTORY_AUTH' });
  }
  assert.equal(reads, 0);
});
