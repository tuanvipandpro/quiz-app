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

// This runs only from a protected-base checkout in pull_request_target. It
// changes the exact PR's state, not a commit-scoped verdict shared by PRs.
export async function enforceProductionRouting({
  eventName,
  event,
  repository,
  repositoryId,
  token,
  fetchImpl = fetch,
}) {
  const pr = event?.pull_request;
  const expectedId = Number(repositoryId);
  if (
    eventName !== 'pull_request_target' ||
    !production(pr?.base?.ref) ||
    !repoName(repository) ||
    repoName(pr?.base?.repo?.full_name) !== repoName(repository) ||
    !Number.isSafeInteger(expectedId) ||
    expectedId < 1 ||
    pr.base.repo.id !== expectedId ||
    !Number.isSafeInteger(pr.number) ||
    pr.number < 1
  )
    throw new Error('Untrusted production-routing event.');
  if (typeof token !== 'string' || !token) throw new Error('Missing routing permission.');
  const url = `https://api.github.com/repos/${repository}/pulls/${pr.number}`;
  const request = (method, body) =>
    fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
  try {
    // Queued webhook data can be stale after a base edit or manual closure.
    const read = await request('GET');
    if (!read.ok) throw new Error('Read rejected.');
    const current = await read.json();
    if (
      current.number !== pr.number ||
      current.base?.repo?.id !== expectedId ||
      repoName(current.base?.repo?.full_name) !== repoName(repository) ||
      !['open', 'closed'].includes(current.state)
    )
      throw new Error('Current PR identity unavailable.');
    if (!production(current.base.ref)) return { closed: false };
    let allowed = false;
    try {
      assertPullRequestSource({
        eventName: 'pull_request',
        event: { pull_request: current },
        repository,
        repositoryId,
      });
      allowed = true;
    } catch {
      // Only a currently rejected production source can be closed below.
    }
    if (allowed) return { closed: false };
    if (current.merged === true) throw new Error('Invalid source already merged.');
    if (current.state === 'closed') return { closed: false };
    const response = await request('PATCH', { state: 'closed' });
    if (!response.ok) throw new Error('Closure rejected.');
    const result = await response.json();
    if (result.state !== 'closed' || result.merged === true)
      throw new Error('Closure not verified.');
  } catch {
    throw new Error('Unable to enforce production PR routing.');
  }
  return { closed: true };
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
  } else if (process.argv[2] === 'enforce') {
    const result = await enforceProductionRouting({
      eventName: process.env.GITHUB_EVENT_NAME,
      event: JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')),
      repository: process.env.GITHUB_REPOSITORY,
      repositoryId: process.env.GITHUB_REPOSITORY_ID,
      token: process.env.GITHUB_TOKEN,
    });
    console.log(
      result.closed
        ? 'Closed an invalid-source production PR.'
        : 'No production PR closure required.'
    );
  } else if (process.argv[2] === 'protection' && process.argv.length === 4)
    console.log(JSON.stringify(branchProtectionFor(process.argv[3]), null, 2));
  else throw new Error('Use git-process.mjs check, enforce or protection <branch>.');
}
