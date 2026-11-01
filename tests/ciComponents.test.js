import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { classifyTargets } from '../scripts/ci-plan.mjs';
import { checkGate, checkFrontendGate } from '../scripts/ci-gate.mjs';

const change = (file, extra = {}) => ({
  file,
  status: 'M',
  before: '100644',
  after: '100644',
  ...extra,
});
const selected = (...files) => classifyTargets(files.map((file) => change(file)));

test('component ownership selects frontend, backend or both without suppressing shared changes', () => {
  for (const file of [
    'worker/index.js',
    'worker/config.js',
    'worker/migrations/0003.sql',
    'tests/worker/auth.test.js',
    'scripts/check-worker.mjs',
  ])
    assert.deepEqual(selected(file), { frontend: false, backend: true });
  for (const file of [
    'src/App.jsx',
    'public/quiz/AWS/test.json',
    'tests/e2e/appAi.spec.js',
    'firebase/firestore.rules',
    'tests/userService.test.js',
    'vite.config.js',
  ])
    assert.deepEqual(selected(file), { frontend: true, backend: false });
  for (const file of [
    'src/utils/questionModel.js',
    'src/services/llm/explanationPrompt.js',
    'tests/explanationPrompt.test.js',
    'package.json',
    'yarn.lock',
    '.github/workflows/backend.yml',
    'scripts/ci-plan.mjs',
    'tests/ciPlan.test.js',
    'tests/fixtures/workerHarness.mjs',
    'unknown.file',
  ])
    assert.deepEqual(selected(file), { frontend: true, backend: true });
  assert.deepEqual(selected('README.md', 'worker/README.md'), { frontend: false, backend: false });
  assert.deepEqual(selected('src/App.jsx', 'worker/auth.js'), { frontend: true, backend: true });
  for (const malformed of [
    change('worker/auth.js', { after: '120000' }),
    change('worker/../README.md'),
    change('/worker/auth.js'),
    change('worker/auth.js', { before: undefined }),
  ])
    assert.deepEqual(classifyTargets([malformed]), { frontend: true, backend: true });
  assert.deepEqual(classifyTargets([]), { frontend: true, backend: true });
});

test('every transitive browser module imported by the Worker selects both components', () => {
  const visited = new Set();
  const visit = (file) => {
    if (visited.has(file)) return;
    visited.add(file);
    if (file.startsWith('src/'))
      assert.deepEqual(selected(file), { frontend: true, backend: true }, file);
    const source = fs.readFileSync(file, 'utf8');
    for (const [, specifier] of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      if (specifier.startsWith('.'))
        visit(path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)));
    }
  };
  visit('worker/index.js');
  assert(visited.has('src/utils/questionModel.js'));
  assert(visited.has('src/services/llm/explanationPrompt.js'));
});

test('root gate allows only selected component skips and never hides failed jobs', () => {
  for (const targets of [
    { frontend: true, backend: false },
    { frontend: false, backend: true },
    { frontend: true, backend: true },
  ]) {
    const results = {
      plan: { result: 'success' },
      docs: { result: 'success' },
      frontend: { result: targets.frontend ? 'success' : 'skipped' },
      backend: { result: targets.backend ? 'success' : 'skipped' },
    };
    assert.doesNotThrow(() => checkGate('full', results, targets));
    for (const component of ['frontend', 'backend']) {
      for (const result of [
        'failure',
        'cancelled',
        undefined,
        ...(targets[component] ? ['skipped'] : []),
      ])
        assert.throws(() => checkGate('full', { ...results, [component]: { result } }, targets));
    }
    assert.throws(() => checkGate('full', results, { frontend: false, backend: false }));
    assert.throws(() => checkGate('full', results, { frontend: 'false', backend: false }));
  }
});

test('frontend gate requires Rules for full and browser checks for both profiles', () => {
  for (const profile of ['assets', 'full']) {
    const results = {
      verify: { result: 'success' },
      e2e: { result: 'success' },
      rules: { result: profile === 'full' ? 'success' : 'skipped' },
    };
    assert.doesNotThrow(() => checkFrontendGate(profile, results));
    for (const job of ['verify', 'e2e', ...(profile === 'full' ? ['rules'] : [])])
      for (const result of ['skipped', 'cancelled', 'failure', undefined])
        assert.throws(() => checkFrontendGate(profile, { ...results, [job]: { result } }));
    assert.throws(() =>
      checkFrontendGate(profile, { ...results, unexpected: { result: 'success' } })
    );
  }
  assert.throws(() => checkFrontendGate('docs', {}));
});
