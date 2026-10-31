import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { checkBuild } from '../scripts/check-build.mjs';

async function fixture(t, base = '/') {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'quiz-build-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  const directory = new URL(`${pathToFileURL(folder).href}/`);
  await fs.mkdir(new URL('assets/', directory));
  await fs.writeFile(new URL('assets/app.js', directory), 'console.log("production");');
  await fs.writeFile(new URL('assets/app.css', directory), 'body { margin: 0; }');
  await fs.writeFile(new URL('favicon.svg', directory), '<svg />');
  await fs.copyFile(new URL('../public/CNAME', import.meta.url), new URL('CNAME', directory));
  await fs.writeFile(
    new URL('index.html', directory),
    `<link rel="icon" href="${base}favicon.svg"><link rel="stylesheet" href="${base}assets/app.css"><script src="${base}assets/app.js"></script>`
  );
  return directory;
}

test('the custom-domain build resolves its favicon, CSS and JavaScript from the root', async (t) => {
  await checkBuild({ directory: await fixture(t), base: '/' });
});

test('a stale /quiz-app/ build is rejected when deploying to the custom-domain root', async (t) => {
  await assert.rejects(
    checkBuild({ directory: await fixture(t, '/quiz-app/'), base: '/' }),
    /Built resource is missing for base \/: \/quiz-app\//
  );
});

test('explicit subpath builds still validate against their configured base', async (t) => {
  await checkBuild({ directory: await fixture(t, '/quiz-app/'), base: '/quiz-app/' });
});

test('publishing a different CNAME cannot silently change the custom domain', async (t) => {
  const directory = await fixture(t);
  await fs.writeFile(new URL('CNAME', directory), 'wrong.example.test\n');
  await assert.rejects(checkBuild({ directory, base: '/' }), /Built CNAME does not match/);
});

test('the production fixture-leak guard remains enforced', async (t) => {
  const directory = await fixture(t);
  await fs.writeFile(new URL('assets/app.js', directory), 'const key = "quiz-e2e-auth";');
  await assert.rejects(checkBuild({ directory, base: '/' }), /E2E fixture leaked/);
});

for (const marker of ['__test/token', 'http://127.0.0.1:5176']) {
  test(`the custom-domain build rejects the App AI test boundary ${marker}`, async (t) => {
    const directory = await fixture(t);
    await fs.writeFile(
      new URL('assets/app.js', directory),
      `const endpoint = ${JSON.stringify(marker)};`
    );
    await assert.rejects(checkBuild({ directory, base: '/' }), /E2E fixture leaked/);
  });
}
