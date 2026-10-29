import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkUiSkill, uiSkillDirectory } from '../scripts/check-ui-skill.mjs';

function copySkill(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-ui-skill-'));
  fs.cpSync(uiSkillDirectory, directory, { recursive: true });
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('the bundled skill matches its pinned upstream inventory', () => {
  assert.match(checkUiSkill().revision, /^[a-f0-9]{40}$/);
});

test('a changed search engine cannot pass the provenance check', (t) => {
  const directory = copySkill(t);
  fs.appendFileSync(path.join(directory, 'scripts/core.py'), '\n# changed\n');
  assert.throws(() => checkUiSkill(directory), /Pinned UI skill changed: scripts\/core.py/);
});

test('missing runtime data fails verification', (t) => {
  const directory = copySkill(t);
  fs.unlinkSync(path.join(directory, 'data/stacks/react.csv'));
  assert.throws(() => checkUiSkill(directory), /ENOENT/);
});

test('extra runtime files fail while Python bytecode caches are ignored', (t) => {
  const directory = copySkill(t);
  const cache = path.join(directory, 'scripts/__pycache__');
  fs.mkdirSync(cache, { recursive: true });
  fs.writeFileSync(path.join(cache, 'core.cpython-314.pyc'), 'local cache');
  assert.doesNotThrow(() => checkUiSkill(directory));
  fs.writeFileSync(path.join(directory, 'scripts/unreviewed.py'), '# extra code');
  assert.throws(() => checkUiSkill(directory), /Unrecorded UI skill file/);
});

test('the inventory rejects paths outside the skill', (t) => {
  const directory = copySkill(t);
  const manifestPath = path.join(directory, 'SOURCE.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.files[0].path = '../outside';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.throws(() => checkUiSkill(directory), /Invalid or duplicate UI skill path/);
});
