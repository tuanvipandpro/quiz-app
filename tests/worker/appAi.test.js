import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { workerHarness, modelResult, applyWorkerMigrations } from '../fixtures/workerHarness.mjs';
import { AI_POLICY, utcDay } from '../../worker/config.js';
import { createUsageRepository } from '../../worker/repository.js';
import { appAiQualityCases } from '../fixtures/appAiQualityCases.js';

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
test('server validation, byte cap, model allowlist and Vietnamese output for legacy EN/VN requests', async (t) => {
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
    { ...input(), max_tokens: 100000 },
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
  assert.equal(observed[0].payload.max_tokens, 1536);
  assert.equal(observed[0].payload.messages[0].role, 'system');
  assert.match(observed[0].payload.messages[0].content, /Chỉ trả lời bằng tiếng Việt/);
  assert.match(observed[0].payload.messages[1].content, /Câu hỏi và các lựa chọn/);
  assert.match(observed[1].payload.messages[0].content, /tiếng Việt/);
  for (const { payload } of observed) {
    assert.match(payload.messages[1].content, /#### 1\. Hiểu câu hỏi/);
    assert.match(payload.messages[1].content, /#### 3\. Vì sao đáp án đúng/);
    assert.match(payload.messages[1].content, /#### 4\. Vì sao các đáp án khác sai/);
    assert.doesNotMatch(payload.messages[1].content, /không phân tích các lựa chọn sai|180 từ/);
  }
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

test('the public quality-review pack fits the real request/prompt boundary without live inference', async (t) => {
  const observed = [];
  const h = await workerHarness({
    now: () => stamp,
    ai: async (_model, payload) => {
      observed.push(payload);
      return modelResult('Stub output; this does not establish model quality.');
    },
  });
  t.after(h.dispose);
  for (const sample of appAiQualityCases) {
    const body = { ...input(), question: sample.question, language: sample.uiLanguage };
    assert.ok(Buffer.byteLength(JSON.stringify(body)) <= AI_POLICY.maxBodyBytes, sample.id);
    const response = await call(h, body);
    assert.equal(response.status, 200, `${sample.id}: ${JSON.stringify(response.data)}`);
  }
  assert.equal(h.calls(), 8);
  const promptBytes = observed.map((payload) =>
    payload.messages.reduce((total, message) => total + Buffer.byteLength(message.content), 0)
  );
  assert.ok(Math.max(...promptBytes) <= AI_POLICY.maxPromptBytes);
  assert.ok(Math.max(...promptBytes) >= AI_POLICY.maxPromptBytes - 256);
  const tooLarge = structuredClone(appAiQualityCases.at(-1).question);
  tooLarge.options.A += '界'.repeat(200);
  assert.equal((await call(h, { ...input(), question: tooLarge })).status, 413);
  assert.equal(h.calls(), 8);
});
test('idempotent result, changed payload conflict and owner-scoped request IDs', async (t) => {
  const h = await workerHarness({ now: () => stamp });
  t.after(h.dispose);
  const body = input();
  assert.equal((await call(h, body)).status, 200);
  assert.equal((await call(h, body)).data.cached, true);
  assert.equal((await call(h, { ...body, language: 'vi' })).data.cached, true);
  assert.equal((await call(h, { ...body, question: { ...question, answer: ['B'] } })).status, 409);
  assert.equal((await call(h, body, { uid: 'bob' })).status, 200);
  assert.equal(h.calls(), 2);
  assert.equal(
    (await call(h, null, { path: '/v1/usage' })).data.usage.remaining,
    AI_POLICY.userLimit - 1
  );
});
test('parallel reservations enforce user last slot and global last slot atomically', async (t) => {
  const h = await workerHarness({ now: () => stamp });
  t.after(h.dispose);
  const repo = createUsageRepository(h.db);
  for (let i = 0; i < AI_POLICY.userLimit - 1; i++) {
    const id = input().requestId;
    await repo.reserve('alice', id, 'hash', stamp);
    await repo.finish('alice', id, { text: 'cached' });
  }
  const personal = await Promise.all([call(h, input()), call(h, input())]);
  assert.equal(personal.filter((x) => x.status === 200).length, 1);
  assert.equal(personal.find((x) => x.status !== 200).data.error, 'USER_LIMIT');
  for (let i = 0; i < AI_POLICY.globalLimit - AI_POLICY.userLimit - 1; i++) {
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

test('quota migration preserves five used attempts and grants only the remaining fifteen', async (t) => {
  assert.equal(AI_POLICY.userLimit, 20);
  assert.equal(AI_POLICY.globalLimit, 100);
  const h = await workerHarness({ now: () => stamp, migrations: ['0001_ai_requests.sql'] });
  t.after(h.dispose);
  const repo = createUsageRepository(h.db);
  for (let i = 0; i < 5; i++) {
    const id = input().requestId;
    await repo.reserve('alice', id, 'fixture-hash', stamp);
    await repo.finish('alice', id, { text: `saved ${i}` });
  }
  await assert.rejects(repo.reserve('alice', input().requestId, 'fixture-hash', stamp), {
    code: 'USER_LIMIT',
  });
  const before = await h.db.prepare('SELECT * FROM ai_requests ORDER BY request_id').all();
  await applyWorkerMigrations(h.db, ['0002_increase_personal_quota.sql']);
  const after = await h.db.prepare('SELECT * FROM ai_requests ORDER BY request_id').all();
  assert.deepEqual(after.results, before.results);
  assert.equal((await repo.usage('alice', stamp)).remaining, 15);
  const next = await call(h, input());
  assert.equal(next.status, 200);
  assert.equal(next.data.usage.limit, 20);
  assert.equal(next.data.usage.remaining, 14);
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
  assert.equal(retry.data.usage.remaining, AI_POLICY.userLimit - 1);
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
  assert.equal(next.data.usage.remaining, AI_POLICY.userLimit - 1);
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
    assert.equal(response.data.usage.remaining, AI_POLICY.userLimit - 1 - i);
  }
});
