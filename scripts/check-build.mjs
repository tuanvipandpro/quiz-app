import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import viteConfig from '../vite.config.js';

export async function checkBuild({
  directory = new URL('../dist/', import.meta.url),
  base = viteConfig.base,
} = {}) {
  const baseUrl = new URL(base.endsWith('/') ? base : `${base}/`, 'https://build.invalid');
  const html = await fs.readFile(new URL('index.html', directory), 'utf8');
  for (const [, reference] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const resource = new URL(reference, baseUrl);
    if (resource.origin !== baseUrl.origin) continue;
    if (!resource.pathname.startsWith(baseUrl.pathname))
      throw new Error(`Built resource is outside the configured base ${base}: ${reference}`);
    const relative = resource.pathname.slice(baseUrl.pathname.length);
    try {
      await fs.access(new URL(relative, directory));
    } catch {
      throw new Error(`Built resource is missing for base ${base}: ${reference}`);
    }
  }

  const expectedCname = await fs.readFile(new URL('../public/CNAME', import.meta.url), 'utf8');
  const publishedCname = await fs.readFile(new URL('CNAME', directory), 'utf8');
  if (publishedCname.trim() !== expectedCname.trim())
    throw new Error('Built CNAME does not match public/CNAME.');

  const assets = new URL('assets/', directory);
  for (const file of await fs.readdir(assets)) {
    if (!file.endsWith('.js')) continue;
    const content = await fs.readFile(new URL(file, assets), 'utf8');
    if (/quiz-e2e-auth|quiz-e2e-profile:|quiz-e2e-fail-signout|quiz-e2e-custom/.test(content))
      throw new Error(`E2E fixture leaked into production: ${file}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await checkBuild();
  console.log('Production resources and CNAME are valid; no E2E fixtures are bundled.');
}
