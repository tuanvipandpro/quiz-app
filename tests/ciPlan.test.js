import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  classifyChanges,
  changesBetween,
  createPlan,
  selectValidatedBase,
  lookupValidatedBase,
  createReleasePlan,
  isValidationBranch,
  validationBranch,
} from '../scripts/ci-plan.mjs';
import { checkGate } from '../scripts/ci-gate.mjs';
import { checkAgentBudget, checkLinks, headingIds } from '../scripts/check-docs.mjs';
import { accountCases, viewportCases } from './e2e/viewports.js';

const change = (file, status = 'M', extra = {}) => ({
  file,
  status,
  before: status === 'A' ? undefined : '100644',
  after: status === 'D' ? undefined : '100644',
  ...extra,
});
function workspace(t) {
  const parent = path.resolve(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(parent, 'quiz-ci-policy-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), parent);
    assert(path.basename(directory).startsWith('quiz-ci-policy-'));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return directory;
}

test('development docs and issue templates use light validation, including additions/deletions', () => {
  assert.equal(
    classifyChanges([
      change('AGENTS.md'),
      change('README.md'),
      change('docs/a guide.md', 'A'),
      change('docs/retired.md', 'D'),
      change('.github/ISSUE_TEMPLATE/change.yml'),
    ]),
    'docs'
  );
});

test('only modifications of known existing image assets use the smoke profile', () => {
  assert.equal(classifyChanges([change('public/quizmos.svg')]), 'assets');
  assert.equal(
    classifyChanges([change('docs/contributing.md'), change('public/providers/aws.png')]),
    'assets'
  );
  for (const item of [
    change('public/quizmos.svg', 'A'),
    change('public/quizmos.svg', 'D'),
    change('public/new-logo.svg'),
  ])
    assert.equal(classifyChanges([item]), 'full');
});

test('runtime, shared styles, data, auth, dependencies and CI always escalate to full', () => {
  for (const file of [
    'src/App.css',
    'src/components/SignInModal.css',
    'src/i18n/messages.js',
    'src/services/authService.js',
    'src/services/userService.js',
    'public/summaries/guide.md',
    'public/quiz/AWS/AIP_C01.json',
    'public/CNAME',
    'package.json',
    'yarn.lock',
    '.github/workflows/test.yml',
    '.github/actions/setup/action.yml',
    'scripts/ci-plan.mjs',
    'tests/e2e/app.spec.js',
    '.agents/skills/a/SKILL.md',
    'firebase/firestore.rules',
    'firebase.emulator.json',
    '.gitignore',
    'unknown.file',
  ])
    assert.equal(classifyChanges([change('README.md'), change(file)]), 'full', file);
});

test('empty, malformed, mode-changing and symlink changes cannot select light CI', () => {
  assert.equal(classifyChanges([]), 'full');
  for (const item of [
    change('README.md', 'T'),
    change('README.md', 'R100'),
    change('README.md', 'M', { after: '120000' }),
    change('README.md', 'M', { after: '100755' }),
    change('README.md', 'M', { before: undefined }),
    change('docs/../src/App.md'),
    change('/docs/a.md'),
    change('docs\\a.md'),
    change('docs/a\n.md'),
  ])
    assert.equal(classifyChanges([item]), 'full');
});

test('real Git comparison covers every commit in a PR/push, not only the last docs commit', (t) => {
  const cwd = workspace(t);
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  const commit = () => {
    git('add', '.');
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  git('init', '-q');
  fs.writeFileSync(path.join(cwd, 'README.md'), '# First\n');
  const base = commit();
  fs.writeFileSync(path.join(cwd, 'README.md'), '# Second\n');
  const docsHead = commit();
  assert.equal(
    createPlan({
      eventName: 'pull_request',
      validatedBase: base,
      head: docsHead,
      cwd,
    }).profile,
    'docs'
  );
  fs.writeFileSync(path.join(cwd, 'runtime.js'), 'export const n = 1;\n');
  commit();
  fs.writeFileSync(path.join(cwd, 'README.md'), '# Third\n');
  const head = commit();
  assert.equal(changesBetween(base, head, cwd).length, 2);
  assert.equal(createPlan({ eventName: 'push', validatedBase: base, head, cwd }).profile, 'full');
  for (const validatedBase of [undefined, '0'.repeat(40), 'f'.repeat(40)])
    assert.equal(createPlan({ eventName: 'push', validatedBase, head, cwd }).profile, 'full');
  assert.equal(
    createPlan({ eventName: 'push', validatedBase: head, head: base, cwd }).profile,
    'full'
  );
  assert.equal(
    createPlan({ eventName: 'workflow_dispatch', validatedBase: base, head: docsHead, cwd })
      .profile,
    'full'
  );
});

test('release uses the complete current push, while CI can include older unvalidated runtime', (t) => {
  const cwd = workspace(t);
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  const commit = () => {
    git('add', '.');
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  git('init', '-q');
  fs.writeFileSync(path.join(cwd, 'README.md'), '# First\n');
  const base = commit();
  fs.mkdirSync(path.join(cwd, 'worker'));
  fs.writeFileSync(path.join(cwd, 'worker/index.js'), 'export const value=1;\n');
  const runtime = commit();
  fs.writeFileSync(path.join(cwd, 'README.md'), '# Later docs\n');
  const head = commit();
  const push = (before, after = head) => ({ ref: 'refs/heads/master', before, after });
  const release = (event, eventName = 'push', revision = head) =>
    createReleasePlan({ eventName, event, head: revision, cwd });
  const ci = createPlan({ eventName: 'push', validatedBase: base, head, cwd });
  assert.equal(ci.backend, true);
  assert.equal(ci.profile, 'full');
  assert.deepEqual(release(push(runtime)), {
    releaseFrontend: false,
    releaseBackend: false,
    releaseValid: true,
    releaseBaseline: runtime,
  });
  assert.deepEqual(release(push(base)), {
    releaseFrontend: false,
    releaseBackend: true,
    releaseValid: true,
    releaseBaseline: base,
  });
  const fallback = createPlan({ eventName: 'push', head, cwd });
  assert.equal(fallback.frontend, true);
  assert.equal(fallback.backend, true);
  assert.equal(release(push(base)).releaseFrontend, false);
  assert.equal(release(push(base)).releaseBackend, true);
  assert.equal(
    createReleasePlan({
      eventName: 'push',
      event: { ...push(base), ref: 'refs/heads/main' },
      head,
      cwd,
      productionBranch: 'main',
    }).releaseBackend,
    true
  );
  assert.equal(
    createReleasePlan({ eventName: 'push', event: push(base), head, cwd, productionBranch: 'main' })
      .releaseBackend,
    false
  );
  assert.deepEqual(release(undefined, 'pull_request'), {
    releaseFrontend: false,
    releaseBackend: false,
    releaseValid: true,
  });
  for (const event of [
    undefined,
    push(undefined),
    push('0'.repeat(40)),
    push('f'.repeat(40)),
    push(base, base),
    { ...push(base), ref: 'refs/heads/feature' },
  ]) {
    const value = release(event);
    assert.equal(value.releaseValid, false);
    assert.equal(value.releaseFrontend, false);
    assert.equal(value.releaseBackend, false);
  }
  assert.equal(release(push(head, base), 'push', base).releaseValid, false);
});

const repository = 'tuanvipandpro/quiz-app';

test('milestone branches require a positive milestone and a real yyyyMMdd date', () => {
  for (const branch of [
    'main',
    'master',
    'develop',
    'work/release-m1-20261106',
    'work/release-m12-20280229',
  ])
    assert.equal(isValidationBranch(branch), true, branch);
  for (const branch of [
    undefined,
    'feature',
    'work/release-m0-20261106',
    'work/release-m1-20260229',
    'work/release-m1-20261301',
    'work/release-m1-2026116',
    'work/release-m1-20261106/extra',
  ])
    assert.equal(isValidationBranch(branch), false, String(branch));
  assert.equal(
    validationBranch('pull_request', {
      pull_request: { base: { ref: 'develop' }, head: { ref: 'untrusted' } },
    }),
    'develop'
  );
  assert.equal(
    validationBranch('push', { ref: 'refs/heads/work/release-m1-20261106' }),
    'work/release-m1-20261106'
  );
  assert.equal(validationBranch('push', { ref: 'refs/tags/develop' }), undefined);
  assert.equal(validationBranch('workflow_dispatch', { ref: 'refs/heads/master' }), undefined);
});

test('integration pushes validate without publishing and invalid production configuration fails closed', () => {
  const head = 'b'.repeat(40);
  for (const branch of ['develop', 'work/release-m1-20261106', 'main']) {
    assert.deepEqual(
      createReleasePlan({
        eventName: 'push',
        event: { ref: 'refs/heads/' + branch, after: head },
        head,
        productionBranch: 'master',
      }),
      {
        releaseFrontend: false,
        releaseBackend: false,
        releaseValid: true,
      }
    );
  }
  for (const productionBranch of [null, 'develop', 'work/release-m1-20261106'])
    assert.equal(
      createReleasePlan({
        eventName: 'push',
        event: { ref: 'refs/heads/develop', after: head },
        head,
        productionBranch,
      }).releaseValid,
      false
    );
  assert.equal(
    createReleasePlan({
      eventName: 'push',
      event: { ref: 'refs/heads/develop', after: 'c'.repeat(40) },
      head,
    }).releaseValid,
    false
  );
});
const successfulMaster = {
  event: 'push',
  head_branch: 'master',
  status: 'completed',
  conclusion: 'success',
  path: '.github/workflows/test.yml',
  head_repository: { full_name: repository },
  head_sha: 'a'.repeat(40),
};
test('only a successful run of the same repository master validation workflow is trusted', () => {
  assert.equal(
    selectValidatedBase({ workflow_runs: [successfulMaster] }, repository),
    successfulMaster.head_sha
  );
  for (const patch of [
    { event: 'pull_request' },
    { head_branch: 'feature' },
    { status: 'in_progress' },
    { conclusion: 'failure' },
    { conclusion: 'cancelled' },
    { path: '.github/workflows/other.yml' },
    { head_repository: { full_name: 'other/repo' } },
    { head_sha: '0'.repeat(40) },
    { head_sha: 'invalid' },
  ])
    assert.equal(
      selectValidatedBase({ workflow_runs: [{ ...successfulMaster, ...patch }] }, repository),
      undefined
    );
  for (const data of [undefined, {}, { workflow_runs: [] }])
    assert.equal(selectValidatedBase(data, repository), undefined);
});

test('baseline lookup uses read-only workflow history and falls back on API/network/JSON failures', async () => {
  let requested;
  const result = await lookupValidatedBase({
    repository,
    fetchImpl: async (url, options) => {
      requested = { url, options };
      return { ok: true, json: async () => ({ workflow_runs: [successfulMaster] }) };
    },
  });
  assert.equal(result, successfulMaster.head_sha);
  assert.match(
    requested.url,
    /workflows\/test\.yml\/runs\?branch=master&event=push&status=success/
  );
  assert.equal(requested.options.method, undefined);
  for (const fetchImpl of [
    async () => {
      throw new Error('network');
    },
    async () => ({ ok: false }),
    async () => ({
      ok: true,
      json: async () => {
        throw new Error('JSON');
      },
    }),
  ])
    assert.equal(await lookupValidatedBase({ repository, fetchImpl }), undefined);
});

test('baseline lookup isolates target branch/repository and encodes milestone refs', async () => {
  for (const branch of ['main', 'develop', 'work/release-m1-20261106']) {
    const run = { ...successfulMaster, head_branch: branch };
    assert.equal(
      selectValidatedBase({ workflow_runs: [successfulMaster] }, repository, branch),
      undefined
    );
    assert.equal(selectValidatedBase({ workflow_runs: [run] }, repository, branch), run.head_sha);
    assert.equal(
      selectValidatedBase(
        { workflow_runs: [{ ...run, head_repository: { full_name: 'fork/repo' } }] },
        repository,
        branch
      ),
      undefined
    );
    let url;
    assert.equal(
      await lookupValidatedBase({
        repository,
        branch,
        fetchImpl: async (requested) => {
          url = requested;
          return { ok: true, json: async () => ({ workflow_runs: [run] }) };
        },
      }),
      run.head_sha
    );
    assert.equal(new URL(url).searchParams.get('branch'), branch);
    assert(url.includes('branch=' + encodeURIComponent(branch)));
  }
  assert.equal(
    await lookupValidatedBase({
      repository,
      branch: 'develop&event=pull_request',
      fetchImpl: () => {
        throw new Error('Must not request an invalid branch');
      },
    }),
    undefined
  );
});

test('reviewable protection requires PRs/current GitHub Actions checks for admins with no bypass', () => {
  const policy = JSON.parse(
    fs.readFileSync(new URL('../.github/branch-protection.json', import.meta.url))
  );
  assert.equal(policy.enforce_admins, true);
  assert.equal(policy.required_status_checks.strict, true);
  assert.equal(Object.hasOwn(policy.required_status_checks, 'contexts'), false);
  assert.deepEqual(policy.required_status_checks.checks, [
    { context: 'test-and-build', app_id: 15368 },
  ]);
  assert.equal(policy.required_pull_request_reviews.required_approving_review_count, 0);
  // Personal repositories reject organization-only bypass/user/team settings.
  assert.equal(
    Object.hasOwn(policy.required_pull_request_reviews, 'bypass_pull_request_allowances'),
    false
  );
  assert.equal(policy.allow_force_pushes, false);
  assert.equal(policy.allow_deletions, false);
});

for (const kind of ['docs', 'assets']) {
  test(`unvalidated runtime changes cannot be hidden by a later ${kind} commit`, (t) => {
    const cwd = workspace(t);
    const git = (...args) =>
      execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const commit = () => {
      git('add', '.');
      git('-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-qm', 'fixture');
      return git('rev-parse', 'HEAD');
    };
    git('init', '-q');
    fs.mkdirSync(path.join(cwd, 'public'));
    fs.writeFileSync(path.join(cwd, 'README.md'), '# First\n');
    fs.writeFileSync(path.join(cwd, 'public/quizmos.svg'), '<svg/>\n');
    const validatedBase = commit();
    fs.mkdirSync(path.join(cwd, 'worker'));
    fs.writeFileSync(path.join(cwd, 'worker/index.js'), 'export const broken = true;\n');
    const uncheckedHead = commit();
    fs.writeFileSync(
      path.join(cwd, kind === 'docs' ? 'README.md' : 'public/quizmos.svg'),
      kind === 'docs' ? '# Updated\n' : '<svg><!-- updated --></svg>\n'
    );
    const head = commit();
    for (const eventName of ['push', 'pull_request']) {
      const event = { before: uncheckedHead, pull_request: { base: { sha: uncheckedHead } } };
      const plan = createPlan({ eventName, event, validatedBase, head, cwd });
      assert.equal(plan.profile, 'full');
      assert.equal(plan.backend, true);
      assert.equal(plan.frontend, kind === 'assets');
    }
  });
}

const resultsFor = (profile) =>
  Object.fromEntries(
    ['plan', 'docs', 'frontend', 'backend'].map((job) => [
      job,
      {
        result:
          ['plan', 'docs'].includes(job) ||
          profile === 'full' ||
          (profile === 'assets' && job === 'frontend')
            ? 'success'
            : 'skipped',
      },
    ])
  );
for (const profile of ['docs', 'assets', 'full']) {
  test(`${profile} gate accepts only its successful plan and rejects failed, cancelled or missing prerequisites`, () => {
    const valid = resultsFor(profile);
    assert.doesNotThrow(() => checkGate(profile, valid));
    for (const job of Object.keys(valid)) {
      for (const result of ['failure', 'cancelled', undefined]) {
        assert.throws(() => checkGate(profile, { ...valid, [job]: { result } }));
      }
      if (valid[job].result === 'success')
        assert.throws(() => checkGate(profile, { ...valid, [job]: { result: 'skipped' } }));
    }
  });
}
test('an absent or unknown plan never produces a green aggregate gate', () => {
  for (const profile of ['', undefined, 'minor', 'anything'])
    assert.throws(() => checkGate(profile, resultsFor('full')));
  assert.throws(() =>
    checkGate('full', { ...resultsFor('full'), newCheck: { result: 'skipped' } })
  );
});

test('responsive coverage keeps each required viewport once with phone touch and desktop keyboard projects', () => {
  const desktop = viewportCases('desktop'),
    phone = viewportCases('phone');
  const all = [...desktop, ...phone];
  assert.deepEqual(
    all.map((x) => x.width).sort((a, b) => a - b),
    [320, 390, 412, 768, 844, 1280]
  );
  assert.equal(new Set(all.map((x) => `${x.width}x${x.height}`)).size, 6);
  assert(phone.some((x) => x.width === 844 && x.height === 390));
  assert(desktop.every((x) => x.width >= 768));
  assert.deepEqual([...new Set(all.map((x) => x.language))].sort(), ['en', 'vi']);
  assert.deepEqual([...new Set(all.map((x) => x.theme))].sort(), ['dark', 'light']);
  assert.throws(() => viewportCases('unknown'));
});

test('documentation checker catches broken paths, missing anchors and checkout escapes', (t) => {
  const root = workspace(t);
  fs.writeFileSync(path.join(root, 'target.md'), '# Title\n\n## Details\n\n## Details\n');
  for (const reference of ['target.md#details', 'target.md#details-1']) {
    fs.writeFileSync(path.join(root, 'README.md'), `[Link](${reference})`);
    assert.doesNotThrow(() => checkLinks('README.md', root));
  }
  for (const reference of ['missing.md', 'target.md#missing', '../outside.md']) {
    fs.writeFileSync(path.join(root, 'README.md'), `[Link](${reference})`);
    assert.throws(() => checkLinks('README.md', root));
  }
  assert.deepEqual(headingIds('# UI/UX\n```md\n# Example\n```\n'), ['uiux']);
});

test('account coverage retains all language/theme combinations in both keyboard and touch projects', () => {
  for (const project of ['desktop', 'phone']) {
    const selected = accountCases(project);
    assert.deepEqual([...new Set(selected.map((x) => `${x.language}/${x.theme}`))].sort(), [
      'en/dark',
      'en/light',
      'vi/dark',
      'vi/light',
    ]);
    assert.equal(
      new Set(selected.map((x) => `${x.width}/${x.height}/${x.language}/${x.theme}`)).size,
      selected.length
    );
    assert.equal(viewportCases(project).length, project === 'desktop' ? 2 : 4);
  }
});

test('documentation budget rejects oversized AGENTS without requiring runtime dependencies', (t) => {
  const root = workspace(t),
    file = path.join(root, 'AGENTS.md');
  fs.writeFileSync(file, '# Small\n');
  assert.doesNotThrow(() => checkAgentBudget(root));
  for (const body of ['word '.repeat(601), 'x'.repeat(6145)]) {
    fs.writeFileSync(file, body);
    assert.throws(() => checkAgentBudget(root));
  }
});
