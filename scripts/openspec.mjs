import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(
  new URL('../node_modules/@fission-ai/openspec/bin/openspec.js', import.meta.url)
);
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, DO_NOT_TRACK: '1', OPENSPEC_NO_UPDATE_CHECK: '1' },
});
if (result.error) throw result.error;
if (result.signal) console.error(`OpenSpec was terminated by ${result.signal}.`);
process.exitCode = result.status ?? 1;
