import { Miniflare } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { generateKeyPair, SignJWT } from 'jose';
import { createWorker } from '../../worker/index.js';
import { createFirebaseVerifier } from '../../worker/auth.js';

export async function workerHarness({ now = Date.now, ai, timeoutMs } = {}) {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("local test only")}}',
    compatibilityDate: '2026-07-30',
    d1Databases: ['DB'],
  });
  const db = await mf.getD1Database('DB');
  const sql = await readFile(
    new URL('../../worker/migrations/0001_ai_requests.sql', import.meta.url),
    'utf8'
  );
  // D1 exec splits on newlines; each statement including the trigger stays on one line.
  await db.exec(sql.replace(/^--.*$/gm, '').replace(/\n/g, ' '));
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const projectId = 'demo-quiz-app';
  const token = (uid = 'alice', overrides = {}) =>
    new SignJWT({
      auth_time: Math.floor(now() / 1000) - 1,
      firebase: { sign_in_provider: 'google.com' },
      ...overrides,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject(uid)
      .setAudience(overrides.aud ?? projectId)
      .setIssuer(overrides.iss ?? `https://securetoken.google.com/${projectId}`)
      .setIssuedAt(overrides.iat ?? Math.floor(now() / 1000) - 1)
      .setExpirationTime(overrides.exp ?? Math.floor(now() / 1000) + 3600)
      .sign(privateKey);
  const verify = createFirebaseVerifier(async (kid) => {
    if (kid !== 'test-key') throw new Error();
    return publicKey;
  });
  let calls = 0;
  const env = {
    DB: db,
    FIREBASE_PROJECT_ID: projectId,
    APP_AI_ENABLED: 'true',
    ALLOWED_ORIGINS: 'http://127.0.0.1:5174,http://127.0.0.1:5175',
    AI: {
      async run(model, input) {
        calls++;
        return ai
          ? ai(model, input)
          : {
              response: input.messages[0].content.includes('tiếng Anh')
                ? 'The correct answer follows from the stated conditions.'
                : 'Đáp án phù hợp với điều kiện trong câu hỏi.',
            };
      },
    },
  };
  const worker = createWorker({ verify, now, timeoutMs });
  return { db, env, worker, token, calls: () => calls, dispose: () => mf.dispose() };
}
