import fs from 'node:fs/promises';

const assets = new URL('../dist/assets/', import.meta.url);
for (const file of await fs.readdir(assets)) {
  if (!file.endsWith('.js')) continue;
  const content = await fs.readFile(new URL(file, assets), 'utf8');
  if (
    /quiz-e2e-auth|quiz-e2e-profile:|quiz-e2e-fail-signout|quiz-e2e-custom|__test\/token|127\.0\.0\.1:5176/.test(
      content
    )
  )
    throw new Error(`E2E fixture leaked into production: ${file}`);
}
console.log('Production assets contain no E2E authentication/profile/custom-quiz fixtures.');
