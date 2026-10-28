import { MODELS } from './modelRegistry.js';
import { LlmError, cancelled } from './errors.js';

export function createRouter({
  providers,
  models = MODELS,
  now = Date.now,
  requestTimeoutMs = 20_000,
  totalTimeoutMs = 60_000,
}) {
  const sessions = new Map();
  function providerState(uid, provider, apiKey) {
    const id = `${uid || 'guest'}:${provider}`;
    let state = sessions.get(id);
    if (!state || state.apiKey !== apiKey) {
      state = { apiKey, denied: false, cooldowns: new Map() };
      sessions.set(id, state);
    }
    return state;
  }
  return {
    reset() {
      sessions.clear();
    },
    allowKey(provider, apiKey) {
      for (const [id, state] of sessions) {
        if (id.endsWith(`:${provider}`) && state.apiKey === apiKey) state.denied = false;
      }
    },
    async generate({ keys, prompt, uid, signal }) {
      if (signal?.aborted) throw cancelled();
      if (!Object.values(keys).some(Boolean))
        throw new LlmError('NO_API_KEY', 'Add a Gemini or Groq API key in AI settings.');
      const deadline = now() + totalTimeoutMs;
      const failures = new Map();
      let earliestRetry = Infinity;
      for (const { provider, model } of models) {
        if (signal?.aborted) throw cancelled();
        const apiKey = keys[provider];
        if (!apiKey) continue;
        const state = providerState(uid, provider, apiKey);
        if (state.denied) {
          failures.set(provider, 'Check this provider’s API key and access permissions.');
          continue;
        }
        const retryAt = state.cooldowns.get(model) || 0;
        if (retryAt > now()) {
          earliestRetry = Math.min(earliestRetry, retryAt);
          failures.set(
            provider,
            'Models are temporarily cooling down after a rate limit or connection error.'
          );
          continue;
        }
        const remaining = deadline - now();
        if (remaining <= 0) break;
        try {
          const result = await providers[provider]({
            model,
            apiKey,
            prompt,
            signal,
            timeoutMs: Math.min(requestTimeoutMs, remaining),
          });
          if (signal?.aborted) throw cancelled();
          state.cooldowns.delete(model);
          return { ...result, provider };
        } catch (error) {
          if (signal?.aborted || ['CANCELLED', 'BLOCKED', 'INVALID_REQUEST'].includes(error.code))
            throw signal?.aborted ? cancelled() : error;
          if (!(error instanceof LlmError))
            throw new LlmError('INTERNAL', 'Could not process the AI response. Please retry.');
          failures.set(provider, error.message);
          if (error.code === 'AUTH_FAILED') state.denied = true;
          else {
            const delay = error.code === 'RATE_LIMITED' ? error.retryAfterMs || 60_000 : 15_000;
            state.cooldowns.set(model, now() + delay);
            earliestRetry = Math.min(earliestRetry, now() + delay);
          }
        }
      }
      const summary = [...failures]
        .map(([provider, message]) => `${provider === 'groq' ? 'Groq' : 'Gemini'}: ${message}`)
        .join(' ');
      throw new LlmError(
        'ALL_PROVIDERS_FAILED',
        summary || 'AI requests exceeded the time limit. Please retry.',
        {
          retryAt: Number.isFinite(earliestRetry) ? earliestRetry : null,
        }
      );
    },
  };
}
