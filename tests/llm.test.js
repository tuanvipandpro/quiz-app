import test from 'node:test';
import assert from 'node:assert/strict';
import { createCredentialStore, keysFromProfile } from '../src/services/llm/credentials.js';
import { createRouter } from '../src/services/llm/router.js';
import { MODELS } from '../src/services/llm/modelRegistry.js';
import { LlmError } from '../src/services/llm/errors.js';
import { requestJson, retryDelay } from '../src/services/llm/http.js';
import { generate as gemini } from '../src/services/llm/providers/gemini.js';
import { generate as groq } from '../src/services/llm/providers/groq.js';

const answer = { text: 'Explanation', model: 'actual-model' };
const response = (data, status = 200, headers = {}) => ({
  ok: status < 400,
  status,
  headers: new Headers(headers),
  json: async () => data,
});
function memoryStorage(initial = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: (key) => items.delete(key),
  };
}
function credentialFixture(initial = {}) {
  const storage = memoryStorage(initial);
  const writes = [];
  const profiles = { a: { geminiApiKey: 'legacy-cloud' }, b: {} };
  const service = {
    getUserProfile: async (uid) => ({ success: true, user: profiles[uid] }),
    saveLlmApiKey: async (...args) => {
      writes.push(args);
      return { success: true };
    },
  };
  return {
    store: createCredentialStore(service, () => storage),
    service,
    profiles,
    writes,
    storage,
  };
}

test('legacy key remains readable, explicit deletion never resurrects it', () => {
  assert.equal(keysFromProfile({ geminiApiKey: 'legacy' }).gemini, 'legacy');
  assert.equal(
    keysFromProfile({ geminiApiKey: 'legacy', llmProviders: { gemini: { apiKey: null } } }).gemini,
    ''
  );
});
test('signed-in users never fall back to guest keys or another account', async () => {
  const { store } = credentialFixture({ gemini_api_key: 'guest' });
  assert.equal((await store.getKeys()).gemini, 'guest');
  assert.equal((await store.getKeys('a')).gemini, 'legacy-cloud');
  assert.equal((await store.getKeys('b')).gemini, '');
});
test('key changes are awaited and immediately reflected in cached profile', async () => {
  const { store, writes } = credentialFixture();
  await store.saveKey('gemini', ' new ', 'a');
  await store.saveKey('groq', 'groq-key', 'a');
  assert.deepEqual(writes, [
    ['a', 'gemini', 'new'],
    ['a', 'groq', 'groq-key'],
  ]);
  assert.deepEqual(await store.getKeys('a'), { gemini: 'new', groq: 'groq-key' });
  await store.saveKey('gemini', '', 'a');
  assert.equal((await store.getKeys('a')).gemini, '');
});
test('failed profile write rejects and does not replace the active key', async () => {
  const { store, service } = credentialFixture();
  service.saveLlmApiKey = async () => ({ success: false });
  await assert.rejects(store.saveKey('gemini', 'bad-save', 'a'), /Could not save/);
  assert.equal((await store.getKeys('a')).gemini, 'legacy-cloud');
});
test('simultaneous saves to different providers preserve both keys', async () => {
  const { store } = credentialFixture();
  await Promise.all([store.saveKey('gemini', 'g', 'a'), store.saveKey('groq', 'q', 'a')]);
  assert.deepEqual(await store.getKeys('a'), { gemini: 'g', groq: 'q' });
});
test('session cleanup removes local secrets without any Firestore writes', async () => {
  const { store, writes, profiles, storage } = credentialFixture({ gemini_api_key: 'guest' });
  await store.getKeys('a');
  store.clearSession({ clearGuest: true });
  assert.equal(writes.length, 0);
  assert.equal(profiles.a.geminiApiKey, 'legacy-cloud');
  assert.equal(storage.getItem('gemini_api_key'), null);
  assert.equal((await store.getKeys('a')).gemini, 'legacy-cloud');
});
test('guest keys survive cache resets and do not need Firebase', async () => {
  const { store, writes, storage } = credentialFixture();
  await store.saveKey('groq', 'guest-groq');
  store.clearSession();
  assert.equal((await store.getKeys()).groq, 'guest-groq');
  assert.equal(writes.length, 0);
  assert.equal((await createCredentialStore({}, () => storage).getKeys()).groq, 'guest-groq');
});
test('failed profile reads retry instead of silently using guest credentials', async () => {
  const { store, service } = credentialFixture({ gemini_api_key: 'guest' });
  service.getUserProfile = async () => ({ success: false });
  await assert.rejects(store.getKeys('a'), /Could not load/);
  service.getUserProfile = async () => ({ success: true, user: { geminiApiKey: 'recovered' } });
  assert.equal((await store.getKeys('a')).gemini, 'recovered');
});
test('a delayed read after logout cannot repopulate another session', async () => {
  const { store, service } = credentialFixture();
  let resolve;
  service.getUserProfile = () =>
    new Promise((done) => {
      resolve = done;
    });
  const pending = store.saveKey('groq', 'late', 'a');
  store.clearSession({ clearGuest: true });
  resolve({ success: true, user: {} });
  await assert.rejects(pending, /session changed/);
});

test('router tries high-quota Gemini, then Groq, Flash, and Gemma last', async () => {
  const calls = [];
  const provider = async ({ model }) => {
    calls.push(model);
    if (model !== MODELS.at(-1).model) throw new LlmError('UNAVAILABLE', 'Busy');
    return answer;
  };
  const router = createRouter({ providers: { gemini: provider, groq: provider } });
  assert.equal(
    (await router.generate({ keys: { gemini: 'g', groq: 'q' }, prompt: 'test' })).provider,
    'gemini'
  );
  assert.deepEqual(
    calls,
    MODELS.map((item) => item.model)
  );
});
test('a Groq-only profile never calls Gemini', async () => {
  const router = createRouter({
    providers: { gemini: () => assert.fail('No Gemini key'), groq: async () => answer },
  });
  assert.equal((await router.generate({ keys: { groq: 'q' }, prompt: 'test' })).provider, 'groq');
});
test('invalid key skips the whole provider; key rotation restores it', async () => {
  let geminiCalls = 0;
  const router = createRouter({
    providers: {
      gemini: async ({ apiKey }) => {
        geminiCalls++;
        if (apiKey === 'bad') throw new LlmError('AUTH_FAILED', 'Invalid key');
        return answer;
      },
      groq: async () => answer,
    },
  });
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await router.generate({ keys: { gemini: 'bad', groq: 'good' }, prompt: 'test' })).provider,
      'groq'
    );
  assert.equal(geminiCalls, 1);
  assert.equal(
    (await router.generate({ keys: { gemini: 'fixed' }, prompt: 'test' })).provider,
    'gemini'
  );
});
test('cooldown honors retry time and is isolated between users', async () => {
  let clock = 1000,
    calls = 0;
  const router = createRouter({
    models: [{ provider: 'gemini', model: 'a' }],
    now: () => clock,
    providers: {
      gemini: async () => {
        calls++;
        throw new LlmError('RATE_LIMITED', 'Quota', { retryAfterMs: 5000 });
      },
    },
  });
  const generate = (uid) => router.generate({ uid, keys: { gemini: 'key' }, prompt: 'test' });
  await assert.rejects(generate('a'), (e) => e.retryAt === 6000);
  await assert.rejects(generate('a'));
  assert.equal(calls, 1);
  await assert.rejects(generate('b'));
  assert.equal(calls, 2);
  clock = 6001;
  await assert.rejects(generate('a'));
  assert.equal(calls, 3);
});
test('invalid prompts and blocked content stop fallback', async () => {
  for (const code of ['BLOCKED', 'INVALID_REQUEST']) {
    let calls = 0;
    const router = createRouter({
      providers: {
        gemini: async () => {
          calls++;
          throw new LlmError(code, 'Declined');
        },
      },
    });
    await assert.rejects(
      router.generate({ keys: { gemini: 'key' }, prompt: 'test' }),
      (e) => e.code === code
    );
    assert.equal(calls, 1);
  }
});
test('no key and cancellation cause no provider calls', async () => {
  const router = createRouter({ providers: { gemini: () => assert.fail() } });
  await assert.rejects(
    router.generate({ keys: {}, prompt: 'test' }),
    (e) => e.code === 'NO_API_KEY'
  );
  await assert.rejects(
    router.generate({ keys: { gemini: 'key' }, prompt: 'test', signal: AbortSignal.abort() }),
    (e) => e.code === 'CANCELLED'
  );
});
test('router total deadline prevents more requests after the budget expires', async () => {
  let clock = 0,
    calls = 0;
  const router = createRouter({
    now: () => clock,
    totalTimeoutMs: 10,
    providers: {
      gemini: async () => {
        calls++;
        clock += 20;
        throw new LlmError('TIMEOUT', 'Timeout');
      },
    },
  });
  await assert.rejects(router.generate({ keys: { gemini: 'g' }, prompt: 'test' }));
  assert.equal(calls, 1);
});
test('cancellation during a provider call never starts another model', async () => {
  const controller = new AbortController();
  let calls = 0;
  const router = createRouter({
    providers: {
      gemini: async () => {
        calls++;
        controller.abort();
        throw new LlmError('NETWORK', 'Network');
      },
    },
  });
  await assert.rejects(
    router.generate({ keys: { gemini: 'g' }, prompt: 'test', signal: controller.signal }),
    (e) => e.code === 'CANCELLED'
  );
  assert.equal(calls, 1);
});

test('Gemini joins visible text parts, omits thought parts, and keeps key out of URL', async () => {
  const result = await gemini({
    model: 'test',
    apiKey: 'secret',
    prompt: 'question',
    fetchImpl: async (url, init) => {
      assert.ok(!url.includes('secret'));
      assert.equal(init.headers['x-goog-api-key'], 'secret');
      assert.equal(JSON.parse(init.body).contents[0].parts[0].text, 'question');
      return response({
        modelVersion: 'actual-gemini',
        candidates: [
          {
            content: {
              parts: [
                { text: 'hidden', thought: true },
                { text: 'Part one. ' },
                { text: 'Part two.' },
              ],
            },
          },
        ],
      });
    },
  });
  assert.deepEqual(result, { model: 'actual-gemini', text: 'Part one. Part two.' });
});
test('Gemini blocked and empty responses have explicit errors', async () => {
  await assert.rejects(
    gemini({
      model: 'test',
      apiKey: 'g',
      fetchImpl: async () => response({ promptFeedback: { blockReason: 'SAFETY' } }),
    }),
    (e) => e.code === 'BLOCKED'
  );
  await assert.rejects(
    gemini({ model: 'test', apiKey: 'g', fetchImpl: async () => response({ candidates: [] }) }),
    (e) => e.code === 'EMPTY_RESPONSE'
  );
});
test('Groq uses chat completions and reads content instead of reasoning', async () => {
  const result = await groq({
    model: 'openai/gpt-oss-120b',
    apiKey: 'q',
    prompt: 'question',
    fetchImpl: async (url, init) => {
      assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
      assert.equal(init.headers.Authorization, 'Bearer q');
      assert.equal(JSON.parse(init.body).messages[0].content, 'question');
      return response({
        model: 'actual-groq',
        choices: [{ message: { reasoning: 'hidden', content: 'Answer' } }],
      });
    },
  });
  assert.deepEqual(result, { model: 'actual-groq', text: 'Answer' });
});
test('HTTP errors are normalized without echoing provider secrets', async () => {
  for (const [status, code] of [
    [401, 'AUTH_FAILED'],
    [403, 'AUTH_FAILED'],
    [404, 'MODEL_UNAVAILABLE'],
    [429, 'RATE_LIMITED'],
    [503, 'UNAVAILABLE'],
    [400, 'INVALID_REQUEST'],
  ]) {
    await assert.rejects(
      requestJson('https://example.test', {
        apiKey: {},
        body: {},
        fetchImpl: async () =>
          response({ error: { message: 'secret' } }, status, { 'retry-after': '7' }),
      }),
      (e) =>
        e.code === code &&
        !e.message.includes('secret') &&
        (status !== 429 || e.retryAfterMs === 7000)
    );
  }
});
test('retry delay supports seconds, HTTP dates, and Gemini RetryInfo', () => {
  assert.equal(retryDelay('3', {}, 0), 3000);
  assert.equal(retryDelay('Thu, 01 Jan 1970 00:01:00 GMT', {}, 0), 60000);
  assert.equal(retryDelay(null, { error: { details: [{ retryDelay: '2.5s' }] } }), 2500);
});
test('HTTP timeout and caller cancellation abort the underlying fetch', async () => {
  const hangingFetch = async (_, { signal }) =>
    new Promise((_, reject) =>
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
        once: true,
      })
    );
  await assert.rejects(
    requestJson('https://example.test', {
      apiKey: {},
      body: {},
      timeoutMs: 10,
      fetchImpl: hangingFetch,
    }),
    (e) => e.code === 'TIMEOUT'
  );
  const controller = new AbortController();
  const request = requestJson('https://example.test', {
    apiKey: {},
    body: {},
    signal: controller.signal,
    fetchImpl: hangingFetch,
  });
  controller.abort();
  await assert.rejects(request, (e) => e.code === 'CANCELLED');
});
