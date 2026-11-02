import path from 'node:path';
import { fileURLToPath } from 'node:url';

function assertJobs(results, required, optional = []) {
  const jobs = [...required, ...optional];
  if (Object.keys(results).some((job) => !jobs.includes(job)))
    throw new Error('Unrecognized prerequisite; update the validation plan explicitly.');
  for (const job of jobs) {
    const result = results[job]?.result;
    if (required.includes(job) ? result !== 'success' : !['success', 'skipped'].includes(result))
      throw new Error(`${job}: ${result || 'missing'} does not satisfy the validation plan.`);
  }
}

export function checkGate(
  profile,
  results,
  targets = { frontend: profile !== 'docs', backend: profile === 'full' }
) {
  if (!['docs', 'assets', 'full'].includes(profile)) throw new Error('Missing/invalid CI profile.');
  if (
    typeof targets.frontend !== 'boolean' ||
    typeof targets.backend !== 'boolean' ||
    (profile === 'docs' && (targets.frontend || targets.backend)) ||
    (profile !== 'docs' && !targets.frontend && !targets.backend) ||
    (profile === 'assets' && (!targets.frontend || targets.backend))
  )
    throw new Error('Missing/invalid component selection.');
  const required = ['plan', 'docs'],
    optional = [];
  for (const name of ['frontend', 'backend']) (targets[name] ? required : optional).push(name);
  assertJobs(results, required, optional);
}

export function checkFrontendGate(profile, results) {
  if (!['assets', 'full'].includes(profile)) throw new Error('Invalid frontend profile.');
  assertJobs(
    results,
    profile === 'full' ? ['verify', 'rules', 'e2e'] : ['verify', 'e2e'],
    profile === 'full' ? [] : ['rules']
  );
}

export function checkReleaseSelection(targets, release) {
  if (
    release.valid !== true ||
    typeof release.frontend !== 'boolean' ||
    typeof release.backend !== 'boolean'
  )
    throw new Error('Missing/unverifiable release selection; release gate blocked.');
  for (const component of ['frontend', 'backend']) {
    if (release[component] && targets[component] !== true)
      throw new Error(`${component} release requires its CI checks.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const profile = process.env.CI_PROFILE;
  const results = JSON.parse(process.env.CI_RESULTS || '{}');
  if (process.argv[2] === 'frontend') checkFrontendGate(profile, results);
  else {
    const flag = (name) => {
      if (!['true', 'false'].includes(process.env[name])) throw new Error(`Invalid ${name}.`);
      return process.env[name] === 'true';
    };
    const targets = { frontend: flag('CI_FRONTEND'), backend: flag('CI_BACKEND') };
    checkGate(profile, results, targets);
    checkReleaseSelection(targets, {
      valid: flag('CI_RELEASE_VALID'),
      frontend: flag('CI_RELEASE_FRONTEND'),
      backend: flag('CI_RELEASE_BACKEND'),
    });
  }
  console.log(`All selected checks passed for the ${profile} profile.`);
}
