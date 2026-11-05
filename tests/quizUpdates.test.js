import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quizUpdates } from '../src/data/quizUpdates.js';
import { quizzes } from '../src/data/quizzes.js';
import { validateQuizUpdates } from '../src/utils/quizUpdates.js';
import { parseRoute, quizUrl } from '../src/utils/navigation.js';

test('account and updates deep links preserve parameters and reject extra or encoded path segments', () => {
  for (const page of ['profile', 'updates']) {
    for (const suffix of ['', '/', '?source=link'])
      assert.equal(parseRoute(`#/${page}${suffix}`).page, page);
    assert.equal(parseRoute(`#/${page}?source=link`).params.get('source'), 'link');
    for (const suffix of ['/unknown', '%2Funknown'])
      assert.equal(parseRoute(`#/${page}${suffix}`).page, 'library');
  }
});

test('published update metadata validates and links to canonical catalog identities', () => {
  assert.ok(quizUpdates.length > 0);
  const valid = validateQuizUpdates(quizUpdates, quizzes);
  for (const entry of valid) assert.equal(parseRoute(quizUrl(entry.bankId)).quizId, entry.bankId);
  assert.equal(
    valid.find((entry) => entry.id === 'ctfl-2026-11-01').sourceRevision,
    '241c5b16dc23b04eb9ce0a5c7a63e4833b492a46'
  );
});

test('invalid metadata cannot publish a date, alias, revision or unsupported kind', () => {
  const first = quizUpdates[0];
  for (const patch of [
    { id: '' },
    { bankId: 'missing' },
    { bankId: 'aws-ace' },
    { kind: 'deployed' },
    { date: '2026-02-30' },
    { date: '2026-2-01' },
    { date: 'not-a-date' },
    { date: null },
    { summary: ' ' },
    { summary: 'x'.repeat(601) },
    { sourceRevision: '241c5b1' },
    { sourceRevision: [first.sourceRevision] },
    { sourceRevision: 'https://example.test' },
  ])
    assert.throws(() => validateQuizUpdates([{ ...first, ...patch }], quizzes));
  assert.throws(() => validateQuizUpdates([first, first], quizzes));
  assert.throws(() => validateQuizUpdates(null, quizzes));
});

test('updates sort newest-first with a deterministic tie without mutating input; empty is valid', () => {
  const first = quizUpdates[0];
  const input = [
    { ...first, id: 'b', date: '2026-10-30' },
    { ...first, id: 'z' },
    { ...first, id: 'a' },
  ];
  assert.deepEqual(
    validateQuizUpdates(input, quizzes).map((entry) => entry.id),
    ['a', 'z', 'b']
  );
  assert.equal(input[0].id, 'b');
  assert.deepEqual(validateQuizUpdates([], quizzes), []);
});
