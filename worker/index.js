import { validateQuizQuestions } from '../src/utils/questionModel.js';
import { explanationPrompt } from '../src/services/llm/explanationPrompt.js';
import { AI_POLICY, ApiError, utcDay } from './config.js';
import { createFirebaseVerifier } from './auth.js';
import { createUsageRepository } from './repository.js';

const bytes = (text) => new TextEncoder().encode(text).length;
const canonical = (value) =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]])
        )
      : item
  );
async function fingerprint(input) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(input)))
    ),
    (byte) => byte.toString(16).padStart(2, '0')
  ).join('');
}
async function readBody(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new ApiError('INVALID');
  if (Number(request.headers.get('content-length')) > AI_POLICY.maxBodyBytes)
    throw new ApiError('TOO_LARGE', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError('INVALID');
  let size = 0;
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > AI_POLICY.maxBodyBytes) {
      await reader.cancel();
      throw new ApiError('TOO_LARGE', 413);
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
  } catch {
    throw new ApiError('INVALID');
  }
}
function validateInput(input, now) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !['requestId', 'question', 'language'].includes(key)) ||
    !['en', 'vi'].includes(input.language) ||
    !/^\d{4}-\d{2}-\d{2}:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.requestId || ''
    )
  )
    throw new ApiError('INVALID');
  if (!input.requestId.startsWith(`${utcDay(now)}:`)) throw new ApiError('EXPIRED_REQUEST', 409);
  try {
    validateQuizQuestions([input.question]);
  } catch {
    throw new ApiError('INVALID');
  }
  const prompt = explanationPrompt(input.question, { language: input.language, compact: true });
  if (bytes(prompt) > AI_POLICY.maxPromptBytes) throw new ApiError('TOO_LARGE', 413);
  return prompt;
}
function priorResult(row, hash) {
  if (row.fingerprint !== hash) throw new ApiError('CONFLICT', 409);
  if (row.state === 'pending') throw new ApiError('PENDING', 409);
  if (row.state === 'failed') throw new ApiError(row.error || 'UNAVAILABLE', 503);
  return { ...JSON.parse(row.result), cached: true };
}

export function createWorker({
  verify = createFirebaseVerifier(),
  now = Date.now,
  timeoutMs = AI_POLICY.timeoutMs,
} = {}) {
  return {
    async fetch(request, env) {
      const origin = request.headers.get('origin');
      const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim());
      const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        Vary: 'Origin',
      };
      if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
      const json = (value, status = 200) =>
        new Response(JSON.stringify(value), { status, headers });
      let repo, uid;
      try {
        if (origin && !allowed.includes(origin)) throw new ApiError('ORIGIN', 403);
        const path = new URL(request.url).pathname;
        if (!['/v1/explanations', '/v1/usage'].includes(path)) throw new ApiError('NOT_FOUND', 404);
        if (request.method === 'OPTIONS')
          return new Response(null, {
            status: 204,
            headers: {
              ...headers,
              'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
              'Access-Control-Allow-Headers': 'Authorization,Content-Type',
            },
          });
        if (
          (path.endsWith('usage') && request.method !== 'GET') ||
          (path.endsWith('explanations') && request.method !== 'POST')
        )
          throw new ApiError('METHOD', 405);
        uid = await verify(request, env.FIREBASE_PROJECT_ID, now());
        if (env.APP_AI_ENABLED !== 'true' || !env.DB || !env.AI)
          throw new ApiError('UNAVAILABLE', 503);
        repo = createUsageRepository(env.DB);
        if (path.endsWith('usage')) return json({ usage: await repo.usage(uid, now()) });
        const input = await readBody(request);
        const prompt = validateInput(input, now());
        const hash = await fingerprint({
          question: input.question,
          language: input.language,
          model: AI_POLICY.model,
          version: AI_POLICY.promptVersion,
        });
        const row = await repo.reserve(uid, input.requestId, hash, now());
        if (row) return json({ ...priorResult(row, hash), usage: await repo.usage(uid, now()) });
        let timer;
        try {
          const output = await Promise.race([
            env.AI.run(AI_POLICY.model, {
              messages: [{ role: 'user', content: prompt }],
              max_tokens: AI_POLICY.maxOutputTokens,
            }),
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(new ApiError('TIMEOUT', 503)), timeoutMs);
            }),
          ]);
          if (
            typeof output?.response !== 'string' ||
            !output.response.trim() ||
            bytes(output.response) > 32 * 1024
          )
            throw new ApiError('UNAVAILABLE', 503);
          const result = { text: output.response, model: AI_POLICY.model, provider: 'app' };
          await repo.finish(uid, input.requestId, result);
          return json({ ...result, cached: false, usage: await repo.usage(uid, now()) });
        } catch (error) {
          const code = error.code === 'TIMEOUT' ? 'TIMEOUT' : 'UNAVAILABLE';
          await repo.finish(uid, input.requestId, null, code);
          throw new ApiError(code, 503);
        } finally {
          clearTimeout(timer);
        }
      } catch (error) {
        let usage;
        try {
          if (repo && uid) usage = await repo.usage(uid, now());
        } catch {
          /* Fail closed during D1 outage. */
        }
        return json(
          { error: error instanceof ApiError ? error.code : 'UNAVAILABLE', usage },
          error instanceof ApiError ? error.status : 503
        );
      }
    },
    async scheduled(_event, env) {
      if (env.DB) await createUsageRepository(env.DB).cleanup(now());
    },
  };
}
export default createWorker();
