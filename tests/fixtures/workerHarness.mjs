import { Miniflare } from 'miniflare';
import { readFile, readdir } from 'node:fs/promises';
import { generateKeyPair, SignJWT } from 'jose';
import { createWorker } from '../../worker/index.js';
import { createFirebaseVerifier } from '../../worker/auth.js';

export const modelResult = (text, finishReason = 'stop') => ({
  choices: [{ message: { role: 'assistant', content: text }, finish_reason: finishReason }],
});

const explanationFixture = `#### 1. Hiểu câu hỏi
Đề yêu cầu một audit trail cho management API calls trong AWS account, với ít công sức vận hành. Cần phân biệt ghi nhận hoạt động với metadata, messaging và quyền gọi model.

Đáp án phù hợp với điều kiện trong câu hỏi.

Thuật ngữ: IAM, API, CloudTrail, Pub/Sub.

#### 2. Đáp án
**A. AWS CloudTrail**.

#### 3. Vì sao đáp án đúng
CloudTrail ghi nhận management API activity trong AWS account. Dịch vụ được quản lý này phù hợp trực tiếp với nhu cầu audit, thay vì phải tự xây hệ thống thu thập sự kiện.

#### 4. Vì sao các đáp án khác sai
- **B. AWS Glue Data Catalog:** quản lý metadata về dữ liệu, không thay thế audit trail cho management API calls.
- **C. Google Cloud Pub/Sub:** truyền messages giữa các thành phần; tự nó không ghi nhận API activity trong AWS account.
- **D. IAM permission:** quyền bedrock:InvokeModelWithResponseStream cho phép gọi model bằng streaming. Cấp quyền này không tạo audit trail. Một IAM permission hữu ích cho inference nhưng không giải quyết yêu cầu audit của đề.`;

export async function applyWorkerMigrations(db, files) {
  const directory = new URL('../../worker/migrations/', import.meta.url);
  const migrations =
    files || (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  for (const name of migrations) {
    const sql = await readFile(new URL(name, directory), 'utf8');
    // D1 exec splits on newlines; each trigger must remain one complete statement.
    await db.exec(sql.replace(/^--.*$/gm, '').replace(/\n/g, ' '));
  }
}

export async function workerHarness({ now = Date.now, ai, timeoutMs, migrations } = {}) {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("local test only")}}',
    compatibilityDate: '2026-07-30',
    d1Databases: ['DB'],
  });
  const db = await mf.getD1Database('DB');
  await applyWorkerMigrations(db, migrations);
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
          : modelResult(
              input.messages[0].content.includes('Chỉ trả lời bằng tiếng Việt')
                ? explanationFixture
                : 'Unexpected explanation language.'
            );
      },
    },
  };
  const worker = createWorker({ verify, now, timeoutMs });
  return { db, env, worker, token, calls: () => calls, dispose: () => mf.dispose() };
}
