import { explanationPrompt } from './explanationPrompt.js';
import { LlmError, cancelled } from './errors.js';

// Cache successful explanations in memory only. Account, full prompt, and current
// credentials define reuse; question IDs alone are not unique across quiz banks.
export function createExplanationService({
  credentials,
  router,
  now = Date.now,
  ttlMs = 30 * 60_000,
  maxEntries = 100,
}) {
  const cache = new Map();
  const pending = new Map();
  const accounts = new Map();
  let generation = 0;

  function accountState(account, keys) {
    let state = accounts.get(account);
    if (!state || state.keys.gemini !== keys.gemini || state.keys.groq !== keys.groq) {
      state = { keys: { ...keys } };
      accounts.set(account, state);
      for (const [key, entry] of cache) if (entry.account === account) cache.delete(key);
      for (const [key, job] of pending) {
        if (job.account === account) {
          pending.delete(key);
          job.controller.abort();
        }
      }
    }
    return state;
  }

  function subscribe(job, signal) {
    return new Promise((resolve, reject) => {
      let settled = false;
      job.waiters++;
      function settle(callback, value) {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', abort);
        job.waiters--;
        if (!job.complete && job.waiters === 0) {
          if (pending.get(job.key) === job) pending.delete(job.key);
          job.controller.abort();
        }
        callback(value);
      }
      const abort = () => settle(reject, cancelled());
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      job.promise.then(
        (result) => settle(resolve, { ...result, cached: false }),
        (error) => settle(reject, error)
      );
    });
  }

  return {
    reset() {
      generation++;
      cache.clear();
      accounts.clear();
      for (const job of pending.values()) job.controller.abort();
      pending.clear();
    },
    async generate(question, { uid = null, signal, forceRefresh = false, language = 'vi' } = {}) {
      if (signal?.aborted) throw cancelled();
      const started = generation;
      const keys = await credentials.getKeys(uid);
      if (signal?.aborted || started !== generation) throw cancelled();
      const account = JSON.stringify(uid);
      const state = accountState(account, keys);
      if (!Object.values(keys).some(Boolean))
        throw new LlmError('NO_API_KEY', 'Add a Gemini or Groq API key in AI settings.');
      const prompt = explanationPrompt(question, { language });
      const key = JSON.stringify([uid, prompt]);
      const entry = cache.get(key);
      if (!forceRefresh && entry && entry.expiresAt > now()) {
        // Refresh LRU order without extending the original expiration time.
        cache.delete(key);
        cache.set(key, entry);
        return { ...entry.result, cached: true };
      }
      cache.delete(key);

      let job = pending.get(key);
      if (!job) {
        job = { key, account, controller: new AbortController(), waiters: 0, complete: false };
        pending.set(key, job);
        job.promise = Promise.resolve()
          .then(() => router.generate({ keys, uid, prompt, signal: job.controller.signal }))
          .then((result) => {
            if (
              job.controller.signal.aborted ||
              started !== generation ||
              accounts.get(account) !== state
            )
              throw cancelled();
            if (!result.text?.trim())
              throw new LlmError('EMPTY_RESPONSE', 'The model returned no explanation.');
            cache.set(key, { account, result: { ...result }, expiresAt: now() + ttlMs });
            while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
            return result;
          })
          .finally(() => {
            job.complete = true;
            if (pending.get(key) === job) pending.delete(key);
          });
      }
      return subscribe(job, signal);
    },
  };
}
