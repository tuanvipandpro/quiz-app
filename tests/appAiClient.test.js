import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppAiClient } from '../src/services/llm/appAiClient.js';
const question = { id: 1, question: 'Q', options: { A: 'One', B: 'Two' }, answer: ['A'] };
const usage = {
  remaining: 4,
  limit: 5,
  available: true,
  resetAt: Date.now() + 86400000,
  serverTime: Date.now(),
};

test('retry after a failed regeneration checks that attempt instead of serving an older cached answer', async () => {
  let calls = 0;
  const client = createAppAiClient({
    baseUrl: 'https://api.test',
    getToken: async () => 'token',
    fetchImpl: async (_url, options) => {
      if (options.method === 'GET') return Response.json({ usage });
      calls++;
      if (calls === 2) throw new TypeError('lost response');
      return Response.json({
        text: calls === 1 ? 'old result' : 'new result',
        provider: 'app',
        model: 'fixed',
        usage,
      });
    },
  });
  const options = { uid: 'alice', language: 'en', requestId: 'first' };
  await client.generate(question, options);
  await assert.rejects(
    client.generate(question, { ...options, requestId: 'second', forceRefresh: true }),
    { code: 'NETWORK' }
  );
  const result = await client.generate(question, { ...options, requestId: 'second' });
  assert.equal(result.text, 'new result');
  assert.equal(calls, 3);
});
test('App AI requires uid and configured secure URL before credentials/network', async () => {
  let tokens = 0;
  for (const baseUrl of ['', 'http://public.test']) {
    const client = createAppAiClient({
      baseUrl,
      getToken: () => {
        tokens++;
      },
    });
    await assert.rejects(client.usage('alice'), { code: 'UNAVAILABLE' });
  }
  const client = createAppAiClient({
    baseUrl: 'https://api.test',
    getToken: () => {
      tokens++;
    },
  });
  await assert.rejects(client.usage(null), { code: 'AUTH' });
  assert.equal(tokens, 0);
});
test('App cache isolates account/language, regenerates explicitly and refreshes usage', async () => {
  let generations = 0;
  const client = createAppAiClient({
    baseUrl: 'https://api.test',
    getToken: async (uid) => uid,
    fetchImpl: async (_url, options) => {
      if (options.method === 'GET') return Response.json({ usage });
      generations++;
      return Response.json({ text: 'result', provider: 'app', model: 'fixed', usage });
    },
  });
  const opts = { uid: 'a', language: 'en', requestId: 'id' };
  await client.generate(question, opts);
  assert.equal((await client.generate(question, opts)).cached, true);
  await client.generate(question, { ...opts, language: 'vi' });
  await client.generate(question, { ...opts, uid: 'b' });
  await client.generate(question, { ...opts, forceRefresh: true });
  assert.equal(generations, 4);
  client.reset();
  await client.generate(question, opts);
  assert.equal(generations, 5);
});
test('reset during HTTP request discards late account response', async () => {
  let finish;
  const client = createAppAiClient({
    baseUrl: 'https://api.test',
    getToken: async () => 'token',
    fetchImpl: () =>
      new Promise((r) => {
        finish = r;
      }),
  });
  const pending = client.generate(question, { uid: 'a', language: 'en', requestId: 'id' });
  await new Promise((r) => setImmediate(r));
  client.reset();
  finish(Response.json({ text: 'private', usage }));
  await assert.rejects(pending, { name: 'AbortError' });
});
test('quota/error payload remains actionable without credential fallback', async () => {
  const client = createAppAiClient({
    baseUrl: 'https://api.test',
    getToken: async () => 'token',
    fetchImpl: async () =>
      Response.json({ error: 'USER_LIMIT', usage: { ...usage, remaining: 0 } }, { status: 429 }),
  });
  await assert.rejects(
    client.generate(question, { uid: 'a', language: 'en', requestId: 'id' }),
    (error) => error.code === 'USER_LIMIT' && error.usage.remaining === 0
  );
});
