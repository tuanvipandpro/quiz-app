import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDocumentation } from './ci-plan.mjs';

export function headingIds(content) {
  const seen = new Map();
  return [...content.replace(/```[\s\S]*?```/g, '').matchAll(/^#{1,6}\s+(.+)$/gm)].map(
    ([, text]) => {
      const slug = text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_\-\s]/gu, '')
        .trim()
        .replace(/\s/g, '-');
      const count = seen.get(slug) || 0;
      seen.set(slug, count + 1);
      return count ? `${slug}-${count}` : slug;
    }
  );
}

export function checkLinks(file, root = process.cwd()) {
  const content = fs.readFileSync(path.resolve(root, file), 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const [, reference] of content.matchAll(/\]\(([^)\s]+)\)/g)) {
    const repoPrefix = 'https://github.com/tuanvipandpro/quiz-app/blob/master/';
    const ownRepo = reference.startsWith(repoPrefix);
    if (!ownRepo && /^[a-z]+:/i.test(reference)) continue;
    const [name, fragment] = (ownRepo ? reference.slice(repoPrefix.length) : reference).split('#');
    const target = ownRepo
      ? path.resolve(root, decodeURIComponent(name))
      : path.resolve(root, path.dirname(file), decodeURIComponent(name) || path.basename(file));
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(target))
      throw new Error(`Invalid local link in ${file}: ${reference}`);
    // Do not follow repository symlinks outside the checkout.
    const realRelative = path.relative(fs.realpathSync(root), fs.realpathSync(target));
    if (realRelative.startsWith('..') || path.isAbsolute(realRelative))
      throw new Error(`Link escapes checkout in ${file}: ${reference}`);
    if (
      fragment &&
      target.endsWith('.md') &&
      !headingIds(fs.readFileSync(target, 'utf8')).includes(decodeURIComponent(fragment))
    )
      throw new Error(`Missing anchor in ${file}: ${reference}`);
  }
}

export function checkAgentBudget(root = process.cwd()) {
  const content = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  if (Buffer.byteLength(content) > 6144 || content.trim().split(/\s+/).length > 600)
    throw new Error(
      'AGENTS.md exceeds 600 words / 6 KiB; move detail into task-specific references.'
    );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((file) => isDocumentation(file) && fs.existsSync(file));
  checkAgentBudget();
  for (const file of files) checkLinks(file);
  const local = path.resolve('node_modules/prettier/bin/prettier.cjs');
  const command = fs.existsSync(local) ? process.execPath : 'prettier';
  const args = [...(fs.existsSync(local) ? [local] : []), '--check', ...files];
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
  console.log(
    `Documentation links, configuration syntax, formatting and AGENTS budget checked (${files.length} files).`
  );
}
