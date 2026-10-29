import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const uiSkillDirectory = fileURLToPath(
  new URL('../.agents/skills/ui-ux-pro-max/', import.meta.url)
);

export function checkUiSkill(directory = uiSkillDirectory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'SOURCE.json'), 'utf8'));
  if (!/^[a-f0-9]{40}$/.test(manifest.revision) || !manifest.files?.length) {
    throw new Error('UI skill provenance needs a full upstream revision and file inventory.');
  }
  const expected = new Set(['SKILL.md', 'SOURCE.json']);
  for (const file of manifest.files) {
    if (
      typeof file.path !== 'string' ||
      file.path.includes('\\') ||
      file.path.includes(':') ||
      file.path.startsWith('/') ||
      file.path.split('/').some((part) => !part || part === '.' || part === '..') ||
      expected.has(file.path)
    ) {
      throw new Error(`Invalid or duplicate UI skill path: ${file.path}`);
    }
    expected.add(file.path);
    const digest = createHash('sha256')
      .update(fs.readFileSync(path.join(directory, file.path)))
      .digest('hex');
    if (digest !== file.sha256) throw new Error(`Pinned UI skill changed: ${file.path}`);
  }
  for (const required of [
    'LICENSE',
    'references/upstream-skill.md',
    'references/quick-reference.md',
    'references/pro-rules.md',
    'scripts/search.py',
    'scripts/core.py',
    'scripts/design_system.py',
    'data/stacks/react.csv',
    'data/ux-guidelines.csv',
  ]) {
    if (!expected.has(required)) throw new Error(`Missing required UI skill file: ${required}`);
  }
  function inspect(current, prefix = '') {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '__pycache__' && entry.isDirectory()) continue;
      const relative = prefix + entry.name;
      if (entry.isSymbolicLink()) throw new Error(`Unexpected UI skill symlink: ${relative}`);
      if (entry.isDirectory()) inspect(path.join(current, entry.name), relative + '/');
      else if (!expected.delete(relative)) throw new Error(`Unrecorded UI skill file: ${relative}`);
    }
  }
  inspect(directory);
  if (expected.size) throw new Error(`Missing UI skill files: ${[...expected].join(', ')}`);
  return { revision: manifest.revision, files: manifest.files.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = checkUiSkill();
  console.log(`UI/UX Pro Max: ${result.files} upstream files verified at ${result.revision}.`);
}
