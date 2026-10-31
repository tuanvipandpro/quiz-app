const messages = {
  NETWORK: 'Could not reach App AI. Retry to check the same attempt.',
  AUTH: 'Sign in again to use App AI.',
  AUTH_UNAVAILABLE: 'Could not verify your sign-in. Please retry.',
  INVALID: 'This question cannot be sent to App AI. Check its format.',
  TOO_LARGE: 'This question is too long for App AI. You can choose your own API key.',
  USER_LIMIT: 'You have used your App AI allowance for today.',
  GLOBAL_LIMIT: 'App AI has reached its daily allowance. Please return after the reset.',
  BUSY: 'Another App AI request is still running for your account.',
  PENDING: 'This request is still running. Retry to check its result.',
  CONFLICT: 'This request changed. Select Regenerate to start a new attempt.',
  EXPIRED_REQUEST: 'This request has expired. Select Regenerate to start a new attempt.',
  UNAVAILABLE: 'App AI is unavailable. You can choose your own API key.',
  TIMEOUT: 'This attempt timed out. Regenerate starts a new attempt and uses quota.',
};
export function appAiError(code, usage) {
  return Object.assign(new Error(messages[code] || messages.UNAVAILABLE), { code, usage });
}
export function createAppAiClient({ baseUrl, getToken, fetchImpl = fetch }) {
  const cache = new Map();
  let generation = 0;
  const configured = (() => {
    try {
      const url = new URL(baseUrl);
      return (
        url.protocol === 'https:' ||
        (url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))
      );
    } catch {
      return false;
    }
  })();
  async function call(path, uid, signal, body) {
    if (!uid) throw appAiError('AUTH');
    if (!configured) throw appAiError('UNAVAILABLE');
    const epoch = generation;
    const token = await getToken(uid);
    if (signal?.aborted || epoch !== generation) throw new DOMException('Aborted', 'AbortError');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 35_000);
    let response, data;
    try {
      response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method: body ? 'POST' : 'GET',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      data = await response.json();
    } catch {
      if (signal?.aborted || epoch !== generation) throw new DOMException('Aborted', 'AbortError');
      throw appAiError('NETWORK');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
    if (signal?.aborted || epoch !== generation) throw new DOMException('Aborted', 'AbortError');
    if (!response.ok) throw appAiError(data?.error, data?.usage);
    const usage = data?.usage;
    if (
      !usage ||
      !Number.isFinite(usage.remaining) ||
      !Number.isFinite(usage.limit) ||
      !Number.isFinite(usage.resetAt) ||
      !Number.isFinite(usage.serverTime) ||
      usage.remaining < 0 ||
      usage.remaining > usage.limit ||
      typeof usage.available !== 'boolean'
    )
      throw appAiError('UNAVAILABLE');
    return data;
  }
  return {
    configured,
    reset() {
      generation++;
      cache.clear();
    },
    usage: (uid, signal) => call('/v1/usage', uid, signal).then((data) => data.usage),
    async generate(question, { uid, language, requestId, signal, forceRefresh = false }) {
      const key = JSON.stringify([uid, question, language]);
      // A failed regeneration must not make Retry return an older successful answer.
      if (forceRefresh) cache.delete(key);
      const saved = cache.get(key);
      if (!forceRefresh && saved && saved.expires > Date.now()) {
        const { usage } = await call('/v1/usage', uid, signal);
        return { ...saved.result, usage, cached: true };
      }
      const epoch = generation;
      const result = await call('/v1/explanations', uid, signal, { question, language, requestId });
      if (!result.text?.trim()) throw appAiError('UNAVAILABLE', result.usage);
      if (epoch === generation) {
        cache.set(key, { result, expires: Date.now() + 30 * 60_000 });
        if (cache.size > 100) cache.delete(cache.keys().next().value);
      }
      return result;
    },
  };
}
