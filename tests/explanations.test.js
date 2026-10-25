import test from 'node:test';
import assert from 'node:assert/strict';
import { createExplanationService } from '../src/services/llm/explanations.js';
import { LlmError } from '../src/services/llm/errors.js';

const question = { id: '1', question: 'Which answer is correct?', options: { A: 'First', B: 'Second' }, answer: ['B'] };
const result = text => ({ text, provider: 'gemini', model: 'actual-model' });
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function fixture(options = {}) {
  let clock = 0;
  const calls = [];
  const keys = { gemini: 'test-key', groq: '' };
  const router = { generate: async input => { calls.push(input); return result(`Explanation ${calls.length}`); } };
  const credentials = { getKeys: async () => ({ ...keys }) };
  const service = createExplanationService({ router, credentials, now: () => clock, ...options });
  return { service, router, keys, calls, setTime: value => { clock = value; } };
}

test('reopening the same question reuses the explanation and actual model metadata', async () => {
  const { service, calls } = fixture();
  const first = await service.generate(question, { uid: 'a' });
  const second = await service.generate(question, { uid: 'a' });
  assert.equal(calls.length, 1);
  assert.equal(first.cached, false);
  assert.deepEqual(second, { ...first, cached: true });
});

test('accounts and guest sessions never share cached explanations', async () => {
  const { service, calls } = fixture();
  await service.generate(question, { uid: 'a' });
  await service.generate(question, { uid: 'b' });
  await service.generate(question);
  assert.equal(calls.length, 3);
});

test('full question, choices, and marked answer define cache identity, not source IDs', async () => {
  const { service, calls } = fixture();
  await service.generate(question);
  assert.equal((await service.generate({ ...question, id: 'another-bank-id' })).cached, true);
  await service.generate({ ...question, question: 'Different scenario' });
  await service.generate({ ...question, options: { ...question.options, B: 'Different option' } });
  await service.generate({ ...question, answer: ['A'] });
  assert.equal(calls.length, 4);
});

test('shuffled choices in Exam reuse the matching Practice explanation without mutating inputs', async () => {
  const { service, calls } = fixture();
  const reordered = { ...question, options: { B: 'Second', A: 'First' } };
  await service.generate(question);
  assert.equal((await service.generate(reordered)).cached, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(Object.keys(reordered.options), ['B', 'A']);
});

test('expired cache and explicit regeneration issue fresh requests', async () => {
  const { service, calls, setTime } = fixture({ ttlMs: 100 });
  await service.generate(question);
  setTime(99);
  assert.equal((await service.generate(question)).cached, true);
  setTime(100);
  assert.equal((await service.generate(question)).cached, false);
  assert.equal((await service.generate(question, { forceRefresh: true })).cached, false);
  assert.equal(calls.length, 3);
});

test('key rotation or provider removal invalidates account cache', async () => {
  const { service, calls, keys } = fixture();
  await service.generate(question, { uid: 'a' });
  keys.gemini = 'rotated';
  assert.equal((await service.generate(question, { uid: 'a' })).cached, false);
  keys.gemini = '';
  await assert.rejects(service.generate(question, { uid: 'a' }), error => error.code === 'NO_API_KEY');
  assert.equal(calls.length, 2);
});

test('failures and empty responses are not cached', async () => {
  const { service, router } = fixture();
  let calls = 0;
  router.generate = async () => {
    calls++;
    if (calls === 1) throw new LlmError('ALL_PROVIDERS_FAILED', 'Temporarily unavailable');
    if (calls === 2) return result('  ');
    return result('Recovered');
  };
  await assert.rejects(service.generate(question), error => error.code === 'ALL_PROVIDERS_FAILED');
  await assert.rejects(service.generate(question), error => error.code === 'EMPTY_RESPONSE');
  assert.equal((await service.generate(question)).text, 'Recovered');
  assert.equal(calls, 3);
});

test('LRU bound evicts the least recently read explanation', async () => {
  const { service, calls } = fixture({ maxEntries: 2 });
  const b = { ...question, question: 'B' }, c = { ...question, question: 'C' };
  await service.generate(question);
  await service.generate(b);
  await service.generate(question);
  await service.generate(c);
  assert.equal((await service.generate(question)).cached, true);
  assert.equal((await service.generate(b)).cached, false);
  assert.equal(calls.length, 4);
});

test('concurrent consumers share one API call; closing one does not cancel the other', async () => {
  const { service, router } = fixture();
  const started = deferred(), reply = deferred();
  let calls = 0, sharedSignal;
  router.generate = async ({ signal }) => { calls++; sharedSignal = signal; started.resolve(); return reply.promise; };
  const controller = new AbortController();
  const first = service.generate(question, { signal: controller.signal });
  const rejected = assert.rejects(first, error => error.code === 'CANCELLED');
  const second = service.generate(question);
  await started.promise;
  controller.abort();
  await rejected;
  assert.equal(sharedSignal.aborted, false);
  reply.resolve(result('Shared answer'));
  assert.equal((await second).text, 'Shared answer');
  assert.equal((await service.generate(question)).cached, true);
  assert.equal(calls, 1);
});

test('closing every consumer aborts its call and allows a fresh request immediately', async () => {
  const { service, router } = fixture();
  const started = [deferred(), deferred()], replies = [deferred(), deferred()];
  const signals = [];
  router.generate = async ({ signal }) => {
    const index = signals.length;
    signals.push(signal);
    started[index].resolve();
    return replies[index].promise;
  };
  const controller = new AbortController();
  const first = service.generate(question, { signal: controller.signal });
  const rejected = assert.rejects(first, error => error.code === 'CANCELLED');
  await started[0].promise;
  controller.abort();
  await rejected;
  assert.equal(signals[0].aborted, true);
  const second = service.generate(question);
  await started[1].promise;
  replies[0].resolve(result('Obsolete'));
  replies[1].resolve(result('Fresh'));
  assert.equal((await second).text, 'Fresh');
  assert.equal((await service.generate(question)).text, 'Fresh');
});

test('logout reset clears saved answers and rejects late responses from an old session', async () => {
  const { service, router } = fixture();
  await service.generate(question, { uid: 'a' });
  const started = deferred(), reply = deferred();
  router.generate = async ({ signal }) => { started.resolve(signal); return reply.promise; };
  const pending = service.generate({ ...question, question: 'Pending' }, { uid: 'a' });
  const rejected = assert.rejects(pending, error => error.code === 'CANCELLED');
  const signal = await started.promise;
  service.reset();
  assert.equal(signal.aborted, true);
  reply.resolve(result('Old session'));
  await rejected;
  router.generate = async () => result('New session');
  assert.equal((await service.generate(question, { uid: 'a' })).text, 'New session');
});

test('cancellation while loading credentials never starts a provider call', async () => {
  const keys = deferred();
  const service = createExplanationService({ credentials: { getKeys: () => keys.promise }, router: { generate: () => assert.fail() } });
  const controller = new AbortController();
  const pending = service.generate(question, { signal: controller.signal });
  controller.abort();
  keys.resolve({ gemini: 'test' });
  await assert.rejects(pending, error => error.code === 'CANCELLED');
});
