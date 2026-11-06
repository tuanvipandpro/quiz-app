import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isValidationBranch } from './ci-plan.mjs';

export const SOURCE_CHECK = 'pr-source-policy';
const production = (branch) => ['master', 'main'].includes(branch);
const repoName = (value) =>
  typeof value === 'string' && /^[\w.-]+\/[\w.-]+$/.test(value) ? value.toLowerCase() : null;

export function assertPullRequestSource({ eventName, event, repository, repositoryId }) {
  const pr = event?.pull_request;
  const expected = repoName(repository),
    expectedId = Number(repositoryId);
  if (
    eventName !== 'pull_request' ||
    !expected ||
    !Number.isSafeInteger(expectedId) ||
    expectedId < 1 ||
    !pr ||
    !isValidationBranch(pr.base?.ref) ||
    repoName(pr.base?.repo?.full_name) !== expected ||
    pr.base.repo.id !== expectedId ||
    typeof pr.head?.ref !== 'string' ||
    !pr.head.ref ||
    !repoName(pr.head.repo?.full_name) ||
    !Number.isSafeInteger(pr.head.repo.id) ||
    pr.head.repo.id < 1
  )
    throw new Error('Missing or mismatched pull-request repository/branch metadata.');
  if (
    production(pr.base.ref) &&
    (pr.head.ref !== 'develop' ||
      repoName(pr.head.repo.full_name) !== expected ||
      pr.head.repo.id !== expectedId)
  )
    throw new Error('Production PRs must come from develop in this repository.');
  return production(pr.base.ref) ? 'production' : 'integration';
}

export function branchProtectionFor(
  branch,
  base = JSON.parse(fs.readFileSync(new URL('../.github/branch-protection.json', import.meta.url)))
) {
  if (!production(branch) && branch !== 'develop') throw new Error('Unknown protected branch.');
  const policy = structuredClone(base);
  const checks = policy.required_status_checks?.checks;
  const provider = checks?.find((check) => check.context === 'test-and-build')?.app_id;
  if (!Array.isArray(checks) || !Number.isSafeInteger(provider) || provider < 1)
    throw new Error('The required validation check must be pinned to its GitHub App.');
  if (production(branch)) {
    const existing = checks.find((check) => check.context === SOURCE_CHECK);
    if (existing && existing.app_id !== provider) throw new Error('Source-check provider drift.');
    if (!existing) checks.push({ context: SOURCE_CHECK, app_id: provider });
  }
  return policy;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv[2] === 'check') {
    const role = assertPullRequestSource({
      eventName: process.env.GITHUB_EVENT_NAME,
      event: JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')),
      repository: process.env.GITHUB_REPOSITORY,
      repositoryId: process.env.GITHUB_REPOSITORY_ID,
    });
    console.log(`Pull-request source policy passed for ${role}.`);
  } else if (process.argv[2] === 'protection' && process.argv.length === 4)
    console.log(JSON.stringify(branchProtectionFor(process.argv[3]), null, 2));
  else throw new Error('Use git-process.mjs check or git-process.mjs protection <branch>.');
}
