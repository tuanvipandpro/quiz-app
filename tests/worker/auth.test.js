import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createSigningKeyResolver, createFirebaseVerifier } from '../../worker/auth.js';

test('signing-key cache coalesces fetch/import and refreshes rotated keys after TTL', async () => {
  let now = 0,
    fetches = 0,
    imports = 0;
  const resolve = createSigningKeyResolver(
    async () => {
      fetches++;
      return Response.json(
        { keys: [{ kid: fetches === 1 ? 'first' : 'second', kty: 'RSA', alg: 'RS256' }] },
        { headers: { 'cache-control': 'max-age=10' } }
      );
    },
    () => now,
    async (key) => {
      imports++;
      return { kid: key.kid };
    }
  );
  const keys = await Promise.all([resolve('first'), resolve('first')]);
  assert.equal(keys[0], keys[1]);
  assert.equal(fetches, 1);
  assert.equal(imports, 1);
  await assert.rejects(resolve('unknown'), { code: 'AUTH' });
  assert.equal(fetches, 1);
  now = 10001;
  assert.deepEqual(await resolve('second'), { kid: 'second' });
  await assert.rejects(resolve('first'), { code: 'AUTH' });
  assert.equal(fetches, 2);
});
test('signing-key network outage is retryable and never treated as an accepted identity', async () => {
  const resolve = createSigningKeyResolver(async () => {
    throw new Error('offline');
  });
  await assert.rejects(resolve('key'), { code: 'AUTH_UNAVAILABLE', status: 503 });
});

test('published JWKS format verifies a real signed token and rejects a non-signing key', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
  const key = { ...(await exportJWK(publicKey)), kid: 'real-key', alg: 'RS256', use: 'sig' };
  const resolver = createSigningKeyResolver(async () =>
    Response.json({ keys: [key, { ...key, kid: 'encryption', use: 'enc' }] })
  );
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    auth_time: now - 1,
    firebase: { sign_in_provider: 'google.com' },
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'real-key' })
    .setIssuer('https://securetoken.google.com/demo-quiz-app')
    .setAudience('demo-quiz-app')
    .setSubject('alice')
    .setIssuedAt(now - 1)
    .setExpirationTime(now + 60)
    .sign(privateKey);
  assert.equal(
    await createFirebaseVerifier(resolver)(
      new Request('https://worker.test', { headers: { Authorization: `Bearer ${token}` } }),
      'demo-quiz-app'
    ),
    'alice'
  );
  await assert.rejects(resolver('encryption'), { code: 'AUTH' });
});
