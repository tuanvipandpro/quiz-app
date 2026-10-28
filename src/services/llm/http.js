import { LlmError, cancelled } from './errors.js';

export function retryDelay(header, data, now = Date.now()) {
  if (header) {
    const seconds = Number(header);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - now;
    if (Number.isFinite(delay)) return Math.max(1000, delay);
  }
  const retry = data?.error?.details?.find((item) => item.retryDelay)?.retryDelay;
  if (retry && /^\d+(\.\d+)?s$/.test(retry)) return Math.max(1000, parseFloat(retry) * 1000);
  return 60_000;
}

export async function requestJson(
  url,
  { apiKey, body, signal, timeoutMs = 20_000, fetchImpl = globalThis.fetch }
) {
  if (signal?.aborted) throw cancelled();
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...apiKey },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const status = response.status;
      if (status === 401 || status === 403)
        throw new LlmError('AUTH_FAILED', 'API key is invalid or this provider denied access.', {
          status,
        });
      if (status === 429)
        throw new LlmError(
          'RATE_LIMITED',
          'This model has reached a rate limit. Please try again later.',
          {
            status,
            retryAfterMs: retryDelay(response.headers.get('retry-after'), data),
          }
        );
      if (status === 404)
        throw new LlmError('MODEL_UNAVAILABLE', 'This model is unavailable.', { status });
      if (status >= 500)
        throw new LlmError('UNAVAILABLE', 'The AI provider is temporarily unavailable.', {
          status,
        });
      throw new LlmError('INVALID_REQUEST', 'The AI provider could not accept this request.', {
        status,
      });
    }
    if (!data)
      throw new LlmError('EMPTY_RESPONSE', 'The AI provider returned an unreadable response.');
    return data;
  } catch (error) {
    if (signal?.aborted) throw cancelled();
    if (controller.signal.aborted)
      throw new LlmError('TIMEOUT', 'The AI provider took too long to respond.');
    if (error instanceof LlmError) throw error;
    // Do not propagate fetch errors containing URLs, headers, or credentials.
    throw new LlmError(
      'NETWORK',
      'Could not connect to the AI provider. Check your network or browser access.'
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
