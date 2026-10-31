import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const result = spawnSync(
  process.execPath,
  [
    'node_modules/wrangler/bin/wrangler.js',
    'deploy',
    '--dry-run',
    '--config',
    'worker/wrangler.jsonc',
    '--outdir',
    resolve('artifacts/app-ai/worker-build'),
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  }
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
