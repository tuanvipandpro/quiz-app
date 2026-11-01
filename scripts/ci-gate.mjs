import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkGate(profile, results) {
  if (!['docs', 'assets', 'full'].includes(profile)) throw new Error('Missing/invalid CI profile.');
  const jobs = ['plan', 'docs', 'verify', 'rules', 'e2e'];
  if (Object.keys(results).some((job) => !jobs.includes(job)))
    throw new Error('Unrecognized prerequisite; update the validation plan explicitly.');
  const required = new Set(['plan', 'docs']);
  if (profile !== 'docs') {
    required.add('verify');
    required.add('e2e');
  }
  if (profile === 'full') required.add('rules');
  for (const job of jobs) {
    const result = results[job]?.result;
    if (required.has(job) ? result !== 'success' : !['success', 'skipped'].includes(result))
      throw new Error(`${job}: ${result || 'missing'} does not satisfy the ${profile} plan.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  checkGate(process.env.CI_PROFILE, JSON.parse(process.env.CI_RESULTS || '{}'));
  console.log(`All required checks passed for the ${process.env.CI_PROFILE} profile.`);
}
