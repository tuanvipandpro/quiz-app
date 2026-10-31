import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificateResolver } from '../../worker/auth.js';

test('certificate cache coalesces fetch/import and refreshes rotated keys after TTL', async () => {
  let now = 0,
    fetches = 0,
    imports = 0;
  const resolve = createCertificateResolver(
    async () => {
      fetches++;
      return Response.json(
        fetches === 1 ? { first: 'certificate-a' } : { second: 'certificate-b' },
        { headers: { 'cache-control': 'max-age=10' } }
      );
    },
    () => now,
    async (cert) => {
      imports++;
      return { cert };
    }
  );
  const keys = await Promise.all([resolve('first'), resolve('first')]);
  assert.equal(keys[0], keys[1]);
  assert.equal(fetches, 1);
  assert.equal(imports, 1);
  await assert.rejects(resolve('unknown'), { code: 'AUTH' });
  assert.equal(fetches, 1);
  now = 10001;
  assert.deepEqual(await resolve('second'), { cert: 'certificate-b' });
  await assert.rejects(resolve('first'), { code: 'AUTH' });
  assert.equal(fetches, 2);
});
test('certificate network outage is retryable and never treated as an accepted identity', async () => {
  const resolve = createCertificateResolver(async () => {
    throw new Error('offline');
  });
  await assert.rejects(resolve('key'), { code: 'AUTH_UNAVAILABLE', status: 503 });
});
