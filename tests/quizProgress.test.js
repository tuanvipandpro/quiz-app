import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuizProgressStore } from '../src/services/quizProgressStore.js';
import {
  resolveCheckpoint,
  normalizeProgress,
  latestSavedQuiz,
} from '../src/utils/quizProgress.js';

const questions = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function fixture() {
  const profiles = {
    a: { 'quiz-a': { questionIndex: 0, questionId: 'a', savedAt: 1 } },
    b: { 'quiz-b': { questionIndex: 2, questionId: 'c', savedAt: 2 } },
  };
  const writes = [];
  const service = {
    getAllQuizProgress: async (uid) => structuredClone(profiles[uid]),
    saveQuizProgress: async (uid, quizId, questionIndex, questionId) => {
      writes.push({ uid, quizId, questionIndex, questionId });
      profiles[uid][quizId] = { questionIndex, questionId };
      return { success: true };
    },
    clearQuizProgress: async (uid, quizId) => {
      delete profiles[uid][quizId];
      return { success: true };
    },
  };
  const store = createQuizProgressStore(service, () => 100);
  return { store, service, profiles, writes };
}

test('saving another quiz preserves the original checkpoint and survives reload', async () => {
  const { store } = fixture();
  await store.setUser('a');
  await store.save('quiz-b', 1, 'b');
  assert.equal(store.getSnapshot().progress['quiz-a'].questionIndex, 0);
  await store.reload();
  assert.equal(store.getSnapshot().progress['quiz-b'].questionId, 'b');
  await store.remove('quiz-a');
  assert.deepEqual(Object.keys(store.getSnapshot().progress), ['quiz-b']);
});

test('failed save/remove rejects, preserves checkpoint, and clears busy state', async () => {
  const { store, service } = fixture();
  await store.setUser('a');
  service.saveQuizProgress = service.clearQuizProgress = async () => ({ success: false });
  await assert.rejects(store.save('quiz-a', 2, 'c'), /Could not save/);
  assert.equal(store.getSnapshot().pendingQuiz, null);
  await assert.rejects(store.remove('quiz-a'), /Could not remove/);
  assert.equal(store.getSnapshot().progress['quiz-a'].questionIndex, 0);
  assert.equal(store.getSnapshot().pendingQuiz, null);
});

test('read errors are visible and retry recovers without dropping known checkpoints', async () => {
  const { store, service } = fixture();
  await store.setUser('a');
  const read = service.getAllQuizProgress;
  service.getAllQuizProgress = async () => {
    throw new Error('Offline');
  };
  await store.reload();
  assert.match(store.getSnapshot().error, /Could not load/);
  assert.equal(store.getSnapshot().progress['quiz-a'].questionIndex, 0);
  service.getAllQuizProgress = read;
  await store.reload();
  assert.equal(store.getSnapshot().error, null);
});

test('a late profile read cannot show another user’s progress', async () => {
  const { store, service } = fixture();
  const delayed = deferred();
  service.getAllQuizProgress = (uid) =>
    uid === 'a' ? delayed.promise : Promise.resolve({ 'quiz-b': { questionIndex: 2 } });
  const first = store.setUser('a');
  await store.setUser('b');
  delayed.resolve({ 'quiz-a': { questionIndex: 0 } });
  await first;
  assert.equal(store.getSnapshot().uid, 'b');
  assert.deepEqual(Object.keys(store.getSnapshot().progress), ['quiz-b']);
});

test('newer reads win when older requests finish out of order', async () => {
  const { store, service } = fixture();
  await store.setUser('a');
  const oldRead = deferred(),
    newRead = deferred();
  let calls = 0;
  service.getAllQuizProgress = () => (++calls === 1 ? oldRead.promise : newRead.promise);
  const oldRequest = store.reload(),
    newRequest = store.reload();
  newRead.resolve({ 'quiz-a': { questionIndex: 5 } });
  await newRequest;
  oldRead.resolve({ 'quiz-a': { questionIndex: 1 } });
  await oldRequest;
  assert.equal(store.getSnapshot().progress['quiz-a'].questionIndex, 5);
});

test('an older read cannot overwrite a confirmed save', async () => {
  const { store, service } = fixture();
  await store.setUser('a');
  const delayed = deferred();
  service.getAllQuizProgress = () => delayed.promise;
  const read = store.reload();
  await store.save('quiz-a', 2, 'c');
  delayed.resolve({ 'quiz-a': { questionIndex: 0 } });
  await read;
  assert.equal(store.getSnapshot().progress['quiz-a'].questionIndex, 2);
  assert.equal(store.getSnapshot().loading, false);
});

test('a save finishing after an account switch cannot update the new account UI', async () => {
  const { store, service, profiles } = fixture();
  await store.setUser('a');
  const delayed = deferred();
  service.saveQuizProgress = (uid, quizId, questionIndex) => {
    assert.equal(uid, 'a');
    assert.equal(quizId, 'quiz-a');
    assert.equal(questionIndex, 2);
    return delayed.promise;
  };
  const write = store.save('quiz-a', 2, 'c');
  const rejected = assert.rejects(write, (error) => error.code === 'SESSION_CHANGED');
  await store.setUser('b');
  delayed.resolve({ success: true });
  await rejected;
  assert.deepEqual(store.getSnapshot().progress, profiles.b);
  assert.equal(store.getSnapshot().pendingQuiz, null);
});

test('guests cannot save and double clicks cannot create duplicate writes', async () => {
  const { store, service, writes } = fixture();
  await assert.rejects(store.save('quiz-a', 0, 'a'), /login/);
  await store.setUser('a');
  const delayed = deferred();
  const save = service.saveQuizProgress;
  service.saveQuizProgress = async (...args) => {
    await delayed.promise;
    return save(...args);
  };
  const first = store.save('quiz-a', 1, 'b');
  await assert.rejects(store.save('quiz-a', 2, 'c'), /wait/);
  delayed.resolve();
  await first;
  assert.equal(writes.length, 1);
});

test('question one is a valid checkpoint and IDs follow reordered questions', () => {
  assert.equal(resolveCheckpoint(questions, { questionIndex: 0 }).index, 0);
  assert.deepEqual(
    resolveCheckpoint([questions[2], questions[0], questions[1]], {
      questionId: 'a',
      questionIndex: 0,
    }),
    { index: 1, adjusted: true, reason: 'moved' }
  );
  assert.equal(resolveCheckpoint([{ id: 7 }], { questionId: '7', questionIndex: 9 }).index, 0);
});

test('removed questions and shortened banks fall back to a safe position', () => {
  assert.deepEqual(resolveCheckpoint(questions, { questionId: 'removed', questionIndex: 100 }), {
    index: 2,
    adjusted: true,
    reason: 'missing',
  });
  assert.equal(resolveCheckpoint(questions, { questionIndex: 100 }).index, 2);
  assert.equal(resolveCheckpoint(questions, { questionId: 'removed' }).index, 0);
  assert.equal(resolveCheckpoint([], { questionIndex: 0 }), null);
  assert.equal(resolveCheckpoint(questions, { questionIndex: -1 }), null);
});

test('invalid records are filtered and newest valid quiz is selected', () => {
  const progress = {
    a: { questionIndex: 0, savedAt: 5 },
    b: { questionIndex: 2, savedAt: { toMillis: () => 10 } },
    removed: { questionIndex: 0, savedAt: 99 },
    broken: null,
  };
  assert.deepEqual(Object.keys(normalizeProgress(progress)), ['a', 'b', 'removed']);
  assert.equal(latestSavedQuiz(progress, ['a', 'b']), 'b');
});

test('legacy ACE checkpoints appear under Google ACE, taking the newest valid save and preferring canonical ties', async () => {
  const canonical = { questionIndex: 4, questionId: '5', savedAt: 100 };
  const legacy = { questionIndex: 9, questionId: '10', savedAt: { toMillis: () => 200 } };
  const merged = normalizeProgress({
    'gcp-ace': canonical,
    'aws-ace': legacy,
    other: { questionIndex: 0 },
  });
  assert.equal(merged['gcp-ace'].questionIndex, 9);
  assert.equal(merged['gcp-ace'].quizId, 'gcp-ace');
  assert.equal(merged['aws-ace'], undefined);
  assert.equal(latestSavedQuiz(merged, ['gcp-ace', 'other']), 'gcp-ace');
  assert.equal(
    normalizeProgress({ 'aws-ace': { questionIndex: 2, savedAt: 100 }, 'gcp-ace': canonical })[
      'gcp-ace'
    ],
    canonical
  );
  assert.equal(
    normalizeProgress({ 'gcp-ace': canonical, 'aws-ace': { questionIndex: 2, savedAt: 100 } })[
      'gcp-ace'
    ],
    canonical
  );
  assert.equal(normalizeProgress({ 'aws-ace': null, 'gcp-ace': canonical })['gcp-ace'], canonical);
  const { store, profiles, writes } = fixture();
  profiles.a = { 'aws-ace': { questionIndex: 1, questionId: 'b', savedAt: 3 } };
  await store.setUser('a');
  assert.equal(store.getSnapshot().progress['gcp-ace'].questionId, 'b');
  await store.save('aws-ace', 2, 'c');
  assert.equal(writes.at(-1).quizId, 'gcp-ace');
  await store.setUser('b');
  assert.equal(store.getSnapshot().progress['gcp-ace'], undefined);
});
