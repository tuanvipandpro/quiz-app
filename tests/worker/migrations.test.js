import test from 'node:test';
import assert from 'node:assert/strict';
import { assertMigrationsReady } from '../../scripts/check-worker-migrations.mjs';

const expected = ['0001_schema.sql', '0002_quota.sql'];
const response = (names) => [{ success: true, results: names.map((name) => ({ name })) }];

test('release accepts the deployed migration ledger only when it matches the reviewed revision', () => {
  assert.doesNotThrow(() => assertMigrationsReady(expected, response(expected)));
  assert.doesNotThrow(() => assertMigrationsReady(expected, response([...expected].reverse())));
  for (const applied of [[], [expected[0]], [...expected, '0003_newer.sql']])
    assert.throws(() => assertMigrationsReady(expected, response(applied)), /migrations differ/);
});

test('missing, failed or malformed migration evidence blocks release without applying SQL', () => {
  for (const value of [
    null,
    [],
    {},
    [{ success: false, results: [] }],
    [{ success: true }],
    [{ success: true, results: [{ name: null }] }],
  ])
    assert.throws(() => assertMigrationsReady(expected, value), /Invalid D1/);
  assert.throws(() => assertMigrationsReady([], response(expected)), /Invalid D1/);
});
