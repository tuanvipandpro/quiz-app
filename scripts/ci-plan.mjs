import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SHA = /^[a-f0-9]{40}$/;
export function isValidationBranch(branch) {
  if (['main', 'master', 'develop'].includes(branch)) return true;
  const match = /^work\/release-m[1-9]\d*-(\d{4})(\d{2})(\d{2})$/.exec(branch || '');
  if (!match) return false;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function validationBranch(eventName, event) {
  const branch =
    eventName === 'pull_request'
      ? event?.pull_request?.base?.ref
      : eventName === 'push' && event?.ref?.startsWith('refs/heads/')
        ? event.ref.slice('refs/heads/'.length)
        : undefined;
  return isValidationBranch(branch) ? branch : undefined;
}
const imageAssets = new Set([
  'public/quizmos.svg',
  'public/providers/anthropic.png',
  'public/providers/aws.png',
  'public/providers/microsoft.ico',
  'public/providers/google-cloud.png',
  'public/providers/istqb.png',
]);
export const isDocumentation = (file) =>
  ['AGENTS.md', 'README.md', 'worker/README.md', '.github/PULL_REQUEST_TEMPLATE.md'].includes(
    file
  ) ||
  /^docs\/[^\n\r]+\.md$/.test(file) ||
  /^\.github\/ISSUE_TEMPLATE\/[^/]+\.(?:md|ya?ml)$/.test(file);

function regularChange({ file, status, before, after }) {
  return (
    Boolean(file) &&
    !file.startsWith('/') &&
    !file.includes('\\') &&
    !file.split('/').some((part) => part === '..' || part === '.') &&
    ['A', 'M', 'D'].includes(status) &&
    (status === 'A' || before === '100644') &&
    (status === 'D' || after === '100644')
  );
}

export function classifyChanges(changes) {
  if (!changes.length) return 'full';
  let assets = false;
  for (const change of changes) {
    const { file, status } = change;
    if (!regularChange(change)) return 'full';
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

// Runtime contracts imported by both the browser and the production Worker.
const sharedRuntimeFiles = new Set([
  'src/utils/questionModel.js',
  'src/services/llm/explanationPrompt.js',
]);
const sharedFiles = new Set([
  ...sharedRuntimeFiles,
  'tests/questionFormats.test.js',
  'tests/explanationPrompt.test.js',
  'tests/ciPlan.test.js',
  'tests/ciComponents.test.js',
]);

export function classifyTargets(changes) {
  const both = { frontend: true, backend: true };
  if (!changes.length) return both;
  let frontend = false,
    backend = false;
  for (const change of changes) {
    const { file } = change;
    if (!regularChange(change)) return both;
    if (isDocumentation(file)) continue;
    if (sharedFiles.has(file)) return both;
    if (
      file.startsWith('worker/') ||
      file.startsWith('tests/worker/') ||
      /^scripts\/check-worker(?:-migrations)?\.mjs$/.test(file)
    ) {
      backend = true;
    } else if (
      /^(src\/|public\/|firebase\/|tests\/e2e\/|tests\/firestore\/)/.test(file) ||
      (/^tests\/[^/]+\.test\.js$/.test(file) && file !== 'tests/ciPlan.test.js') ||
      [
        'index.html',
        'vite.config.js',
        'playwright.config.js',
        'firebase.json',
        'firebase.emulator.json',
      ].includes(file)
    ) {
      frontend = true;
    } else return both; // Dependencies, CI/toolchain, fixtures and unknown paths fail closed.
  }
  return { frontend, backend };
}

export function classifyReleases(changes) {
  let frontend = false,
    backend = false;
  for (const change of changes) {
    if (!regularChange(change)) throw new Error('Unverifiable release change.');
    const { file } = change;
    if (sharedRuntimeFiles.has(file) || ['package.json', 'yarn.lock'].includes(file)) {
      frontend = true;
      backend = true;
    } else if (
      file.startsWith('public/') ||
      (file.startsWith('src/') && !/(?:^|\/)README\.md$/.test(file)) ||
      ['index.html', 'vite.config.js'].includes(file)
    )
      frontend = true;
    else if (/^worker\/(?:.+\.(?:[cm]?js|ts)|wrangler\.jsonc|migrations\/[^/]+\.sql)$/.test(file))
      backend = true;
    // Tests, workflow/check scripts, dev docs, Firebase and staging config do not publish an app.
  }
  return { frontend, backend };
}

export function createReleasePlan({ eventName, event, head, cwd, productionBranch = 'master' }) {
  const none = { releaseFrontend: false, releaseBackend: false };
  if (eventName === 'pull_request') return { ...none, releaseValid: true };
  try {
    const branch = validationBranch(eventName, event);
    if (
      eventName !== 'push' ||
      !branch ||
      !SHA.test(head || '') ||
      event.after !== head ||
      !['main', 'master'].includes(productionBranch)
    )
      throw new Error('Not a verified validation-branch push.');
    // Integration branches are validated without publishing production artifacts.
    if (branch !== productionBranch) return { ...none, releaseValid: true };
    const releases = classifyReleases(changesBetween(event.before, head, cwd));
    return {
      releaseFrontend: releases.frontend,
      releaseBackend: releases.backend,
      releaseValid: true,
      releaseBaseline: event.before,
    };
  } catch {
    return {
      ...none,
      releaseValid: false,
      releaseReason: 'Cannot verify the production push/configuration; release gate blocked.',
    };
  }
}

export function selectValidatedBase(data, repository, branch = 'master') {
  const run = data?.workflow_runs?.[0];
  if (
    !isValidationBranch(branch) ||
    run?.event !== 'push' ||
    run.head_branch !== branch ||
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

export async function lookupValidatedBase({
  repository,
  token,
  branch = 'master',
  fetchImpl = fetch,
}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '') || !isValidationBranch(branch)) return undefined;
  try {
    const response = await fetchImpl(
      `https://api.github.com/repos/${repository}/actions/workflows/test.yml/runs?branch=${encodeURIComponent(branch)}&event=push&status=success&per_page=1`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(15000),
      }
    );
    return response.ok ? selectValidatedBase(await response.json(), repository, branch) : undefined;
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
      ...classifyTargets(changes),
      head,
      baseline: validatedBase,
      changedFiles: changes.length,
    };
  } catch {
    return {
      profile: 'full',
      frontend: true,
      backend: true,
      head,
      reason: 'No trusted successful target-branch ancestor available; full validation required.',
    };
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  let event;
  try {
    event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  } catch {
    /* Gate blocks unverifiable push evidence. */
  }
  const branch = validationBranch(process.env.GITHUB_EVENT_NAME, event);
  const validatedBase = branch
    ? await lookupValidatedBase({
        repository: process.env.GITHUB_REPOSITORY,
        token: process.env.GH_TOKEN,
        branch,
      })
    : undefined;
  const plan = {
    ...createPlan({ eventName: process.env.GITHUB_EVENT_NAME, validatedBase, head }),
    ...createReleasePlan({
      eventName: process.env.GITHUB_EVENT_NAME,
      event,
      head,
      productionBranch: event?.repository?.default_branch || null,
    }),
    branch: branch || null,
  };
  const shards = plan.profile === 'full' ? [1, 2] : [1];
  if (process.env.GITHUB_OUTPUT)
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `profile=${plan.profile}\nfrontend=${plan.frontend}\nbackend=${plan.backend}\nshards=${JSON.stringify(shards)}\nrelease-frontend=${plan.releaseFrontend}\nrelease-backend=${plan.releaseBackend}\nrelease-valid=${plan.releaseValid}\n`
    );
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `CI profile: **${plan.profile}**, frontend: **${plan.frontend}**, backend: **${plan.backend}**. Head: \`${head}\`.\n\n${plan.reason || `${plan.changedFiles} changed files since successful ${plan.branch} ${plan.baseline}.`}\n\nRelease: frontend **${plan.releaseFrontend}**, backend **${plan.releaseBackend}**, valid **${plan.releaseValid}**. ${plan.releaseReason || (plan.releaseBaseline ? `Production push baseline: ${plan.releaseBaseline}.` : 'No production release.')}\n`
    );
  console.log(JSON.stringify({ ...plan, shards }));
}
