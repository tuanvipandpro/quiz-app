import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function assertMigrationsReady(expected, response) {
  if (
    !expected.length ||
    !Array.isArray(response) ||
    response.length !== 1 ||
    response[0]?.success !== true ||
    !Array.isArray(response[0].results) ||
    response[0].results.some((row) => typeof row.name !== 'string')
  )
    throw new Error('Invalid D1 migration evidence; backend release blocked.');
  const applied = new Set(response[0].results.map((row) => row.name));
  if (
    expected.some((name) => !applied.has(name)) ||
    [...applied].some((name) => !expected.includes(name))
  )
    throw new Error(
      'D1 migrations differ from this revision. Review/apply migrations through the Worker release procedure before retrying; CI does not apply SQL.'
    );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const result = spawnSync(
    process.execPath,
    [
      'node_modules/wrangler/bin/wrangler.js',
      'd1',
      'execute',
      'DB',
      '--remote',
      '--config',
      'worker/wrangler.jsonc',
      '--command',
      'SELECT name FROM d1_migrations ORDER BY name',
      '--json',
    ],
    { encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } }
  );
  if (result.error || result.status !== 0)
    throw new Error(
      'Cannot verify deployed D1 migrations. Check Cloudflare token/account permissions and schema setup; backend release blocked.'
    );
  const expected = fs
    .readdirSync('worker/migrations')
    .filter((name) => name.endsWith('.sql'))
    .sort();
  assertMigrationsReady(expected, JSON.parse(result.stdout));
  console.log(
    `D1 migration ledger matches ${expected.length} reviewed migrations; no SQL applied.`
  );
}
