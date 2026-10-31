import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { workerHarness, modelResult } from '../fixtures/workerHarness.mjs';
import { AI_POLICY, utcDay } from '../../worker/config.js';
import { createUsageRepository } from '../../worker/repository.js';

const question = {
  id: 'one',
  question: 'What is 2 + 2?',
  options: { A: '4', B: '5' },
  answer: ['A'],
};
const stamp = Date.parse('2026-10-31T12:00:00Z');
const input = (at = stamp) => ({
  question,
  language: 'en',
  requestId: `${utcDay(at)}:${randomUUID()}`,
});
async function call(h, body, { uid = 'alice', token, path = '/v1/explanations', origin } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token !== null) headers.Authorization = `Bearer ${token || (await h.token(uid))}`;
  if (origin) headers.Origin = origin;
  const response = await h.worker.fetch(
    new Request('https://worker.test' + path, {
      method: body ? 'POST' : 'GET',
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
    h.env
  );
  return { status: response.status, data: await response.json() };
}
test('JWT signature/claims/guest protection and disabled rollout reject before inference', async (t) => {
  const h = await workerHarness({ now: () => stamp });
  t.after(h.dispose);
  for (const token of [
    null,
    'invalid',
    await h.token('alice', { auth_time: stamp / 1000 + 100 }),
    await h.token('alice', { exp: stamp / 1000 - 100 }),
    await h.token('alice', { iat: stamp / 1000 + 100 }),
    await h.token('alice', { aud: 'wrong-project' }),
    await h.token('alice', { iss: 'https://evil.test' }),
    await h.token('alice', { auth_time: null }),
    await h.token('alice', { firebase: { sign_in_provider: 'anonymous' } }),
    await h.token('alice', { firebase: null }),
  ]) {
    assert.equal((await call(h, input(), { token })).status, 401);
  }
  const foreign = await workerHarness({ now: () => stamp });
  t.after(foreign.dispose);
  assert.equal((await call(h, input(), { token: await foreign.token() })).status, 401);
  h.env.FIREBASE_PROJECT_ID = 'other-project';
  assert.equal((await call(h, input())).status, 401);
  h.env.FIREBASE_PROJECT_ID = 'demo-quiz-app';
  h.env.APP_AI_ENABLED = 'false';
  assert.equal((await call(h, input())).status, 503);
  assert.equal(h.calls(), 0);
});
test('server validation, byte cap, model allowlist and VN/EN prompt', async (t) => {
  const observed = [];
  const h = await workerHarness({
    now: () => stamp,
    ai: async (model, payload) => {
      observed.push({ model, payload });
      return modelResult('valid explanation');
    },
  });
  t.after(h.dispose);
  for (const body of [
    { ...input(), model: 'paid' },
    { ...input(), language: 'xx' },
    { ...input(), question: { ...question, answer: ['Z'] } },
    { ...input(), question: { ...question, question: 'x'.repeat(17000) } },
  ]) {
    assert.ok([400, 413].includes((await call(h, body)).status));
  }
  assert.equal(h.calls(), 0);
  for (const language of ['en', 'vi'])
    assert.equal((await call(h, { ...input(), language })).status, 200);
  assert.equal(observed[0].model, AI_POLICY.model);
  assert.equal(observed[0].payload.max_tokens, 600);
  assert.equal(observed[0].payload.messages[0].role, 'system');
  assert.match(observed[0].payload.messages[0].content, /Respond only in English/);
  assert.match(observed[0].payload.messages[1].content, /Question and choices/);
  assert.match(observed[1].payload.messages[0].content, /tiếng Việt/);
});
test('all supported formats cross the real Worker and D1 boundary', async (t) => {
  const h = await workerHarness({ now: () => stamp });
  t.after(h.dispose);
  for (const format of ['single', 'multiple', 'yes-no', 'dropdown-rows', 'dropdown-inline']) {
    const questions = JSON.parse(
      await readFile(new URL(`../../public/examples/quiz-${format}.json`, import.meta.url), 'utf8')
    );
    const response = await call(h, { ...input(), question: questions[0] });
    assert.equal(response.status, 200, JSON.stringify(response));
  }
});
test('idempotent result, changed payload conflict and owner-scoped request IDs', async (t) => {
  const h = await workerHarness({ now: () => stamp });
  t.after(h.dispose);
  const body = input();
  assert.equal((await call(h, body)).status, 200);
  assert.equal((await call(h, body)).data.cached, true);
  assert.equal((await call(h, { ...body, language: 'vi' })).status, 409);
  assert.equal((await call(h, body, { uid: 'bob' })).status, 200);
  assert.equal(h.calls(), 2);
  assert.equal((await call(h, null, { path: '/v1/usage' })).data.usage.remaining, 4);
});
test('parallel reservations enforce user last slot and global last slot atomically', async (t) => {
  const h = await workerHarness({ now: () => stamp });
  t.after(h.dispose);
  const repo = createUsageRepository(h.db);
  for (let i = 0; i < 4; i++) {
    const id = input().requestId;
    await repo.reserve('alice', id, 'hash', stamp);
    await repo.finish('alice', id, { text: 'cached' });
  }
  const personal = await Promise.all([call(h, input()), call(h, input())]);
  assert.equal(personal.filter((x) => x.status === 200).length, 1);
  assert.equal(personal.find((x) => x.status !== 200).data.error, 'USER_LIMIT');
  for (let i = 0; i < 94; i++) {
    const id = input().requestId;
    await repo.reserve(`seed-${i}`, id, 'hash', stamp);
    await repo.finish(`seed-${i}`, id, { text: 'cached' });
  }
  const global = await Promise.all([
    call(h, input(), { uid: 'bob' }),
    call(h, input(), { uid: 'carol' }),
  ]);
  assert.equal(global.filter((x) => x.status === 200).length, 1);
  assert.equal(global.find((x) => x.status !== 200).data.error, 'GLOBAL_LIMIT');
});
test('pending duplicates and separate requests do not call model twice', async (t) => {
  let release, started;
  const begun = new Promise((r) => {
    started = r;
  });
  const h = await workerHarness({
    now: () => stamp,
    ai: () => {
      started();
      return new Promise((r) => {
        release = r;
      });
    },
  });
  t.after(h.dispose);
  const body = input(),
    pending = call(h, body);
  await begun;
  assert.equal((await call(h, body)).data.error, 'PENDING');
  assert.equal((await call(h, input())).data.error, 'BUSY');
  release(modelResult('finished'));
  assert.equal((await pending).status, 200);
  assert.equal(h.calls(), 1);
});
test('provider failure consumes one attempt and retries never dispatch again', async (t) => {
  const h = await workerHarness({
    now: () => stamp,
    ai: async () => {
      throw new Error('provider quota exhausted');
    },
  });
  t.after(h.dispose);
  const body = input();
  assert.equal((await call(h, body)).data.error, 'UNAVAILABLE');
  const retry = await call(h, body);
  assert.equal(retry.data.usage.remaining, 4);
  assert.equal(h.calls(), 1);
});
test('UTC reset, stale pending and expired IDs fail closed across cleanup', async (t) => {
  let now = stamp;
  const h = await workerHarness({ now: () => now });
  t.after(h.dispose);
  const body = input(),
    repo = createUsageRepository(h.db);
  await repo.reserve('alice', body.requestId, 'hash', now);
  now += AI_POLICY.pendingLeaseMs + 1;
  assert.equal((await repo.reserve('alice', body.requestId, 'hash', now)).error, 'TIMEOUT');
  now += 3 * 86400000;
  await h.worker.scheduled(null, h.env);
  assert.equal((await call(h, body)).data.error, 'EXPIRED_REQUEST');
  const next = await call(h, input(now));
  assert.equal(next.status, 200);
  assert.equal(next.data.usage.remaining, 4);
});
test('CORS is bounded and storage outage never invokes inference', async (t) => {
  const h = await workerHarness({ now: () => stamp });
  t.after(h.dispose);
  assert.equal((await call(h, input(), { origin: 'https://evil.test' })).status, 403);
  h.env.DB = {
    prepare() {
      throw new Error('offline');
    },
  };
  assert.equal((await call(h, input())).status, 503);
  assert.equal(h.calls(), 0);
});

test('timed-out inference is charged once and never dispatched again on retry', async (t) => {
  const h = await workerHarness({
    now: () => stamp,
    timeoutMs: 10,
    ai: () => new Promise(() => {}),
  });
  t.after(h.dispose);
  const body = input();
  assert.equal((await call(h, body)).data.error, 'TIMEOUT');
  assert.equal((await call(h, body)).data.error, 'TIMEOUT');
  assert.equal(h.calls(), 1);
});

test('chat completion parsing rejects empty, truncated and tool-only responses', async (t) => {
  const outputs = [
    modelResult(''),
    modelResult('unfinished answer', 'length'),
    {
      choices: [
        {
          finish_reason: 'stop',
          message: { content: 'tool response', tool_calls: [{ id: 'unexpected' }] },
        },
      ],
    },
  ];
  const h = await workerHarness({ now: () => stamp, ai: async () => outputs.shift() });
  t.after(h.dispose);
  for (let i = 0; i < 3; i++) {
    const response = await call(h, input());
    assert.equal(response.status, 503);
    assert.equal(response.data.error, 'UNAVAILABLE');
    assert.equal(response.data.usage.remaining, 4 - i);
  }
});
