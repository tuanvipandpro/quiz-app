import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  assertPullRequestSource,
  branchProtectionFor,
  SOURCE_CHECK,
  enforceProductionRouting,
} from '../scripts/git-process.mjs';

const repository = 'tuanvipandpro/quiz-app',
  repositoryId = 123;
const input = (base = 'master', head = 'develop') => ({
  eventName: 'pull_request',
  repository,
  repositoryId,
  event: {
    pull_request: {
      base: { ref: base, repo: { id: repositoryId, full_name: repository } },
      head: { ref: head, repo: { id: repositoryId, full_name: repository } },
    },
  },
});

test('trusted production routing closes only the invalid PR even when heads share a SHA', async () => {
  const accepted = input();
  accepted.eventName = 'pull_request_target';
  accepted.event.pull_request.number = 10;
  accepted.event.pull_request.head.sha = 'a'.repeat(40);
  let writes = 0;
  const rejected = structuredClone(accepted);
  rejected.event.pull_request.number = 11;
  rejected.event.pull_request.head.repo = { id: 456, full_name: 'fork/quiz-app' };
  const fetchImpl = async (url, options) => {
    if (options.method === 'GET') {
      const sample = url.endsWith('/10') ? accepted : rejected;
      return {
        ok: true,
        json: async () => ({ ...structuredClone(sample.event.pull_request), state: 'open' }),
      };
    }
    writes++;
    assert.equal(url, 'https://api.github.com/repos/' + repository + '/pulls/11');
    assert.equal(options.method, 'PATCH');
    assert.deepEqual(JSON.parse(options.body), { state: 'closed' });
    return { ok: true, json: async () => ({ state: 'closed', merged: false }) };
  };
  assert.deepEqual(
    await enforceProductionRouting({ ...accepted, token: 'fixture-token', fetchImpl }),
    { closed: false }
  );
  assert.equal(writes, 0);
  assert.deepEqual(
    await enforceProductionRouting({ ...rejected, token: 'fixture-token', fetchImpl }),
    { closed: true }
  );
  assert.equal(writes, 1);
  assert.deepEqual(
    await enforceProductionRouting({ ...accepted, token: 'fixture-token', fetchImpl }),
    { closed: false }
  );
  assert.equal(writes, 1);
});

test('trusted routing rejects forged base/permissions and does not claim closure after API failure', async () => {
  const sample = input('master', 'codex/feature');
  sample.eventName = 'pull_request_target';
  sample.event.pull_request.number = 11;
  for (const patch of [{ eventName: 'pull_request' }, { repositoryId: 456 }])
    await assert.rejects(
      enforceProductionRouting({
        ...sample,
        ...patch,
        token: 'fixture-token',
        fetchImpl: () => {
          throw Error('Must not request');
        },
      }),
      /Untrusted/
    );
  await assert.rejects(enforceProductionRouting(sample), /Missing routing permission/);
  for (const invalidResponse of [
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => ({ state: 'open' }) }),
    async () => ({ ok: true, json: async () => ({ state: 'closed', merged: true }) }),
  ])
    await assert.rejects(
      enforceProductionRouting({
        ...sample,
        token: 'fixture-token',
        fetchImpl: async (_url, options) =>
          options.method === 'GET'
            ? {
                ok: true,
                json: async () => ({
                  ...structuredClone(sample.event.pull_request),
                  state: 'open',
                }),
              }
            : invalidResponse(),
      }),
      /Unable to enforce/
    );
});

test('trusted routing checks out only protected base code with narrow PR permission and no head execution', () => {
  const workflow = fs.readFileSync(
    new URL('../.github/workflows/production-routing.yml', import.meta.url),
    'utf8'
  );
  assert.match(workflow, /pull_request_target:/);
  assert.match(workflow, /branches: \[master, main\]/);
  assert.match(workflow, /ref: \$\{\{ github.event.pull_request.base.sha \}\}/);
  assert.match(workflow, /pull-requests: write/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(
    workflow,
    /pull_request.head|npm|yarn|secrets\.|contents: write|statuses: write|checks: write/
  );
});

test('the guard refreshes current PR metadata before closing a PR whose base already moved', async () => {
  const sample = input('master', 'codex/feature');
  sample.eventName = 'pull_request_target';
  sample.event.pull_request.number = 14;
  const calls = [];
  const fetchImpl = async (_url, options) => {
    calls.push(options.method);
    assert.equal(options.method, 'GET');
    const current = structuredClone(sample.event.pull_request);
    current.base.ref = 'develop';
    current.state = 'open';
    return { ok: true, json: async () => current };
  };
  assert.deepEqual(
    await enforceProductionRouting({ ...sample, token: 'fixture-token', fetchImpl }),
    { closed: false }
  );
  assert.deepEqual(calls, ['GET']);
});

test('production accepts only the same repository develop, including a main rename', () => {
  for (const base of ['master', 'main']) {
    assert.equal(assertPullRequestSource(input(base)), 'production');
    for (const head of ['codex/feature', 'work/release-m1-20261106', 'master', 'main', 'Develop'])
      assert.throws(() => assertPullRequestSource(input(base, head)), /must come from develop/);
  }
});

test('a fork named develop or mismatched repository identity cannot pass production policy', () => {
  for (const change of [
    { id: 456, full_name: 'fork/quiz-app' },
    { id: 456, full_name: repository },
    { id: repositoryId, full_name: 'fork/quiz-app' },
  ]) {
    const sample = input();
    sample.event.pull_request.head.repo = change;
    assert.throws(() => assertPullRequestSource(sample));
  }
  const sample = input();
  sample.event.pull_request.head.repo.full_name = repository.toUpperCase();
  assert.equal(assertPullRequestSource(sample), 'production');
});

test('missing/deleted/unverifiable metadata fails closed', () => {
  for (const mutate of [
    (x) => {
      x.eventName = 'push';
    },
    (x) => {
      x.repositoryId = undefined;
    },
    (x) => {
      x.event = {};
    },
    (x) => {
      x.event.pull_request.base.repo.id = 999;
    },
    (x) => {
      x.event.pull_request.base.repo.full_name = 'fork/repo';
    },
    (x) => {
      x.event.pull_request.head.repo = null;
    },
    (x) => {
      x.event.pull_request.head.ref = '';
    },
    (x) => {
      x.event.pull_request.base.ref = 'unknown';
    },
  ]) {
    const sample = input();
    mutate(sample);
    assert.throws(() => assertPullRequestSource(sample));
  }
});

test('release integration and the requested governance PR into develop remain usable', () => {
  assert.equal(
    assertPullRequestSource(input('develop', 'codex/git-process-rules-97')),
    'integration'
  );
  assert.equal(
    assertPullRequestSource(input('develop', 'work/release-m1-20261106')),
    'integration'
  );
  assert.equal(
    assertPullRequestSource(input('work/release-m1-20261106', 'codex/feature')),
    'integration'
  );
});

test('changing the PR base reevaluates the same head instead of reusing integration acceptance', () => {
  const sample = input('develop', 'codex/feature');
  assert.equal(assertPullRequestSource(sample), 'integration');
  sample.event.pull_request.base.ref = 'master';
  assert.throws(() => assertPullRequestSource(sample), /must come from develop/);
});

test('production protection adds the unique required check without mutating shared develop policy', () => {
  const base = branchProtectionFor('develop');
  const before = structuredClone(base);
  for (const branch of ['master', 'main']) {
    const policy = branchProtectionFor(branch, base);
    assert.equal(policy.enforce_admins, true);
    assert.equal(policy.required_status_checks.strict, true);
    assert.deepEqual(policy.required_status_checks.checks, [
      { context: 'test-and-build', app_id: 15368 },
      { context: SOURCE_CHECK, app_id: 15368 },
    ]);
    assert.deepEqual(branchProtectionFor(branch, policy), policy);
  }
  assert.deepEqual(base, before);
  assert.throws(() => branchProtectionFor('work/release-m1-20261106'));
  assert.throws(() => branchProtectionFor('master', { required_status_checks: { checks: [] } }));
});

test('the policy CLI consumes actual event files and exits nonzero for wrong production sources', (t) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-git-process-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir()));
    fs.rmSync(folder, { recursive: true, force: true });
  });
  const file = path.join(folder, 'event.json');
  const run = (sample) => {
    fs.writeFileSync(file, JSON.stringify(sample.event));
    return spawnSync(process.execPath, ['scripts/git-process.mjs', 'check'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: sample.eventName,
        GITHUB_EVENT_PATH: file,
        GITHUB_REPOSITORY: repository,
        GITHUB_REPOSITORY_ID: String(repositoryId),
      },
    });
  };
  assert.equal(run(input()).status, 0);
  assert.notEqual(run(input('master', 'codex/feature')).status, 0);
});

test('the unique source check handles base edits without heavy-CI metadata reruns or skipped push successes', () => {
  const policy = fs.readFileSync(
    new URL('../.github/workflows/git-process.yml', import.meta.url),
    'utf8'
  );
  const ci = fs.readFileSync(new URL('../.github/workflows/test.yml', import.meta.url), 'utf8');
  assert.match(policy, /types: \[opened, synchronize, reopened, edited, ready_for_review\]/);
  assert.match(policy, /pr-source-policy:/);
  assert.doesNotMatch(
    policy,
    /\n {2}push:|pull_request_target|secrets:|statuses: write|checks: write/
  );
  assert.match(policy, /persist-credentials: false/);
  assert.doesNotMatch(ci, /pr-source-policy:|types:.*edited/);
});
