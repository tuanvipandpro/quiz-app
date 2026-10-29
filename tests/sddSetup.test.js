import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('emulator wrapper refuses project overrides before spawning Java or Firebase', () => {
  const script = fileURLToPath(new URL('../scripts/run-firestore-emulator.mjs', import.meta.url));
  for (const args of [
    ['test', '--project', 'real-project'],
    ['deploy'],
    ['start', '--config', 'other.json'],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /project\/config overrides are not accepted/);
  }
});
