import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2] || 'test';
if (!['test', 'start', 'check'].includes(mode) || process.argv.length > 3)
  throw new Error('Use test:rules or emulators:start; project/config overrides are not accepted.');
const executable = process.platform === 'win32' ? 'java.exe' : 'java';
const candidates = [];
if (process.env.JAVA_HOME)
  candidates.push({
    home: process.env.JAVA_HOME,
    command: path.join(process.env.JAVA_HOME, 'bin', executable),
  });
candidates.push({ home: null, command: 'java' });
// Optional portable installation prepared locally; never download a runtime here.
const portableRoot = fileURLToPath(new URL('../artifacts/tools/java21/', import.meta.url));
if (fs.existsSync(portableRoot)) {
  for (const entry of fs.readdirSync(portableRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const home = path.join(portableRoot, entry.name);
      candidates.push({ home, command: path.join(home, 'bin', executable) });
    }
  }
}
const selected = candidates.find((candidate) => {
  const result = spawnSync(candidate.command, ['-version'], { encoding: 'utf8', timeout: 10000 });
  const major = (result.stderr || result.stdout || '').match(/version "(\d+)/)?.[1];
  return !result.error && result.status === 0 && Number(major || 0) >= 21;
});
if (!selected)
  throw new Error(
    'Firestore Emulator requires Java 21+ on PATH. Configure JAVA_HOME and add its bin directory to PATH.'
  );
if (mode === 'check') {
  console.log('Java 21+ available; emulator runner is pinned to demo-quiz-app and loopback.');
  process.exit(0);
}

const cli = fileURLToPath(
  new URL('../node_modules/firebase-tools/lib/bin/firebase.js', import.meta.url)
);
const config = fileURLToPath(new URL('../firebase.emulator.json', import.meta.url));
const args = [
  cli,
  mode === 'test' ? 'emulators:exec' : 'emulators:start',
  '--only',
  'firestore',
  '--project',
  'demo-quiz-app',
  '--config',
  config,
  '--non-interactive',
];
if (mode === 'test') args.push('node --test --test-concurrency=1 tests/firestore/*.test.js');
const env = {
  ...process.env,
  GCLOUD_PROJECT: 'demo-quiz-app',
  GOOGLE_CLOUD_PROJECT: 'demo-quiz-app',
  FIREBASE_CLI_DISABLE_MOTD: '1',
};
delete env.FIREBASE_TOKEN;
delete env.GOOGLE_APPLICATION_CREDENTIALS;
if (selected.home) {
  env.JAVA_HOME = selected.home;
  for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
  env.PATH = path.join(selected.home, 'bin') + path.delimiter + (process.env.PATH || '');
} else {
  delete env.JAVA_HOME;
}
const result = spawnSync(process.execPath, args, { stdio: 'inherit', env });
if (result.error) throw result.error;
if (result.signal) console.error(`Firebase Emulator runner was terminated by ${result.signal}.`);
process.exitCode = result.status ?? 1;
