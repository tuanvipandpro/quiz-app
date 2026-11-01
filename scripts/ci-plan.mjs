import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SHA = /^[a-f0-9]{40}$/;
const imageAssets = new Set([
  'public/quizmos.svg',
  'public/providers/anthropic.png',
  'public/providers/aws.png',
  'public/providers/microsoft.ico',
  'public/providers/google-cloud.png',
  'public/providers/istqb.png',
]);
export const isDocumentation = (file) =>
  ['AGENTS.md', 'README.md', '.github/PULL_REQUEST_TEMPLATE.md'].includes(file) ||
  /^docs\/[^\n\r]+\.md$/.test(file) ||
  /^\.github\/ISSUE_TEMPLATE\/[^/]+\.(?:md|ya?ml)$/.test(file);

export function classifyChanges(changes) {
  if (!changes.length) return 'full';
  let assets = false;
  for (const change of changes) {
    const { file, status, before, after } = change;
    if (
      !file ||
      file.startsWith('/') ||
      file.includes('\\') ||
      file.split('/').some((part) => part === '..' || part === '.') ||
      !['A', 'M', 'D'].includes(status) ||
      (status !== 'A' && before !== '100644') ||
      (status !== 'D' && after !== '100644')
    )
      return 'full';
    if (isDocumentation(file)) continue;
    if (status === 'M' && imageAssets.has(file)) assets = true;
    else return 'full';
  }
  return assets ? 'assets' : 'docs';
}

export function changesBetween(base, head, cwd = process.cwd()) {
  if (!SHA.test(base || '') || /^0+$/.test(base) || !SHA.test(head || ''))
    throw new Error('A concrete base and head are required.');
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('merge-base', '--is-ancestor', base, head);
  const modes = (revision) =>
    new Map(
      git('ls-tree', '-r', '-z', revision)
        .split('\0')
        .filter(Boolean)
        .map((line) => {
          const split = line.indexOf('\t');
          return [line.slice(split + 1), line.slice(0, split).split(' ')[0]];
        })
    );
  const previous = modes(base),
    current = modes(head);
  const entries = git('diff', '--no-renames', '--name-status', '-z', base, head, '--').split('\0');
  entries.pop();
  if (entries.length % 2) throw new Error('Unexpected Git change list.');
  const changes = [];
  for (let index = 0; index < entries.length; index += 2) {
    const [status, file] = entries.slice(index, index + 2);
    changes.push({ status, file, before: previous.get(file), after: current.get(file) });
  }
  return changes;
}

export function selectValidatedBase(data, repository) {
  const run = data?.workflow_runs?.[0];
  if (
    run?.event !== 'push' ||
    run.head_branch !== 'master' ||
    run.status !== 'completed' ||
    run.conclusion !== 'success' ||
    run.path !== '.github/workflows/test.yml' ||
    run.head_repository?.full_name?.toLowerCase() !== repository?.toLowerCase() ||
    !SHA.test(run.head_sha || '') ||
    /^0+$/.test(run.head_sha)
  )
    return undefined;
  return run.head_sha;
}

export async function lookupValidatedBase({ repository, token, fetchImpl = fetch }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '')) return undefined;
  try {
    const response = await fetchImpl(
      `https://api.github.com/repos/${repository}/actions/workflows/test.yml/runs?branch=master&event=push&status=success&per_page=1`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(15000),
      }
    );
    return response.ok ? selectValidatedBase(await response.json(), repository) : undefined;
  } catch {
    return undefined;
  }
}

export function createPlan({ eventName, validatedBase, head, cwd }) {
  try {
    if (!['pull_request', 'push'].includes(eventName)) throw new Error('Unsupported event.');
    const changes = changesBetween(validatedBase, head, cwd);
    return {
      profile: classifyChanges(changes),
      head,
      baseline: validatedBase,
      changedFiles: changes.length,
    };
  } catch {
    return {
      profile: 'full',
      head,
      reason: 'No trusted successful master ancestor available; full validation required.',
    };
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const validatedBase = await lookupValidatedBase({
    repository: process.env.GITHUB_REPOSITORY,
    token: process.env.GH_TOKEN,
  });
  const plan = createPlan({ eventName: process.env.GITHUB_EVENT_NAME, validatedBase, head });
  const shards = plan.profile === 'full' ? [1, 2] : [1];
  if (process.env.GITHUB_OUTPUT)
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `profile=${plan.profile}\nshards=${JSON.stringify(shards)}\n`
    );
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `CI profile: **${plan.profile}**. Head: \`${head}\`.\n\n${plan.reason || `${plan.changedFiles} changed files since successful master ${plan.baseline}.`}\n`
    );
  console.log(JSON.stringify({ ...plan, shards }));
}
