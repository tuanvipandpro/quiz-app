import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomQuizStore } from '../src/services/customQuizStore.js';
import { customQuizError } from '../src/utils/customQuizModel.js';
import { clearCustomQuizDrafts } from '../src/utils/customQuizDrafts.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};

test('server replacement/deletion invalidates only affected instances while rename keeps drafts', async () => {
  let receive;
  const invalidated = [];
  const first = { slotId: 'slot-1', instanceId: 'one', contentVersion: 1, revision: 1 };
  const second = { slotId: 'slot-2', instanceId: 'two', contentVersion: 1, revision: 1 };
  const store = createCustomQuizStore(
    {
      list: async () => [first, second],
      subscribe: (_, callback) => {
        receive = callback;
        return () => {};
      },
    },
    { onInvalidate: (_, quiz) => invalidated.push(quiz.instanceId) }
  );
  await store.activate('alice', true);
  receive([{ ...first, revision: 2 }, second]);
  assert.deepEqual(invalidated, []);
  receive([{ ...first, revision: 3, contentVersion: 2 }, second]);
  assert.deepEqual(invalidated, ['one']);
  receive([{ ...first, revision: 3, contentVersion: 2 }]);
  assert.deepEqual(invalidated, ['one', 'two']);
});

test('private quizzes load only on enabled routes and are cleared on logout', async () => {
  const calls = [];
  const store = createCustomQuizStore({
    list: async (uid) => {
      calls.push(uid);
      return [{ title: uid }];
    },
  });
  await store.activate('alice', false);
  assert.equal(calls.length, 0);
  await store.activate('alice', true);
  assert.deepEqual(store.getSnapshot().quizzes, [{ title: 'alice' }]);
  store.activate(null, false);
  assert.deepEqual(store.getSnapshot().quizzes, []);
});

test('late reads or subscription callbacks cannot reveal a previous account', async () => {
  const a = deferred(),
    callbacks = {};
  const store = createCustomQuizStore({
    list: (uid) => (uid === 'alice' ? a.promise : Promise.resolve([{ title: 'Bob' }])),
    subscribe: (uid, receive) => {
      callbacks[uid] = receive;
      return () => {};
    },
  });
  const pending = store.activate('alice', true);
  await store.activate('bob', true);
  a.resolve([{ title: 'Alice secret' }]);
  await pending;
  assert.deepEqual(store.getSnapshot().quizzes, [{ title: 'Bob' }]);
  callbacks.bob([{ title: 'Bob update' }]);
  await store.activate('alice', true);
  callbacks.bob([{ title: 'Late Bob' }]);
  assert.deepEqual(store.getSnapshot().quizzes, [{ title: 'Alice secret' }]);
});

test('a newer reload wins and listing failure is an actionable private-only state', async () => {
  const first = deferred();
  let count = 0;
  const store = createCustomQuizStore({
    list: () => (++count === 1 ? first.promise : Promise.resolve([{ title: 'Latest' }])),
  });
  const pending = store.activate('alice', true);
  await store.reload();
  first.resolve([{ title: 'Old' }]);
  await pending;
  assert.equal(store.getSnapshot().quizzes[0].title, 'Latest');
  const failed = createCustomQuizStore({
    list: async () => {
      throw customQuizError('PERMISSION');
    },
  });
  await failed.activate('alice', true);
  assert.equal(failed.getSnapshot().error.code, 'CUSTOM_PERMISSION');
  assert.equal(failed.getSnapshot().loading, false);
  failed.activate('alice', false);
  assert.equal(failed.getSnapshot().loading, false);
});

test('duplicate submissions are rejected and committed writes invalidate only targeted drafts', async () => {
  const pending = deferred(),
    invalidated = [];
  const quiz = { slotId: 'slot-1', instanceId: 'id', revision: 1 };
  const store = createCustomQuizStore(
    { list: async () => [quiz], replace: () => pending.promise },
    { onInvalidate: (...args) => invalidated.push(args) }
  );
  await store.activate('alice', true);
  const save = store.replace(quiz, {});
  await assert.rejects(store.replace(quiz, {}), { code: 'CUSTOM_BUSY' });
  pending.resolve('slot-1');
  await save;
  assert.deepEqual(invalidated, [['alice', quiz]]);
  assert.equal(store.getSnapshot().pending, null);
});

test('writes finishing after an account change never update the next account or invalidate its state', async () => {
  const pending = deferred();
  const invalidated = [];
  const store = createCustomQuizStore(
    { list: async () => [], remove: () => pending.promise },
    { onInvalidate: (...args) => invalidated.push(args) }
  );
  await store.activate('alice', true);
  const save = store.remove({ slotId: 'slot-1' });
  await store.activate('bob', true);
  pending.resolve('slot-1');
  await assert.rejects(save, { code: 'CUSTOM_SESSION_CHANGED' });
  assert.deepEqual(invalidated, []);
  assert.equal(store.getSnapshot().uid, 'bob');
});

test('failed writes preserve known quizzes and reset busy state for retry', async () => {
  const store = createCustomQuizStore({
    list: async () => [{ title: 'Existing' }],
    create: async () => {
      throw customQuizError('SIZE');
    },
  });
  await store.activate('alice', true);
  await assert.rejects(store.create({}), { code: 'CUSTOM_SIZE' });
  assert.equal(store.getSnapshot().pending, null);
  assert.equal(store.getSnapshot().quizzes[0].title, 'Existing');
});

test('targeted cleanup removes old versions without touching bank, other quiz, or other account drafts', () => {
  const uuid = '00000000-0000-4000-8000-000000000001';
  const keys = [
    `quiz-study-v1:alice:cloud:slot-1:${uuid}:v1:practice`,
    `quiz-study-v1:alice:cloud:slot-1:${uuid}:v2:exam`,
    'quiz-study-v1:alice:aws-saa:exam',
    `quiz-study-v1:bob:cloud:slot-1:${uuid}:v1:practice`,
    `quiz-study-v1:alice:cloud:slot-2:${uuid}:v1:practice`,
  ];
  const storage = Object.fromEntries(keys.map((key) => [key, 'saved']));
  Object.defineProperty(storage, 'removeItem', { value: (key) => delete storage[key] });
  clearCustomQuizDrafts(storage, 'alice', { slotId: 'slot-1', instanceId: uuid });
  assert.deepEqual(Object.keys(storage), keys.slice(2));
});
