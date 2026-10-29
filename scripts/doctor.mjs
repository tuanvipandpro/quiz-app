import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const major = Number(process.versions.node.split('.')[0]);
if (major !== 24) throw new Error(`Use Node 24 LTS (.nvmrc); currently ${process.version}.`);
for (const file of [
  'yarn.lock',
  'node_modules/vite/package.json',
  'node_modules/@playwright/test/package.json',
  'node_modules/@fission-ai/openspec/package.json',
  'node_modules/firebase-tools/package.json',
])
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}; run yarn install --frozen-lockfile.`);
const tracked = execFileSync('git', ['ls-files', '.env'], { encoding: 'utf8' }).trim();
if (tracked) throw new Error('.env must stay local, not tracked by Git.');
console.log(`Node ${process.version}; dependencies and lockfile present; .env is untracked.`);
console.log(
  'Dev: 5173. Isolated E2E server: 5174. Install browser once: yarn playwright install chromium.'
);
