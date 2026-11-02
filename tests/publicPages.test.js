import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute } from '../src/utils/navigation.js';
import { readDarkMode } from '../src/utils/appearance.js';
import { validDonation } from '../src/utils/donation.js';

test('public routes preserve explicit study links and reject unknown donation paths', () => {
  for (const hash of ['', '#/', '#/?source=link']) assert.equal(parseRoute(hash).page, 'home');
  assert.equal(parseRoute('#/donate?source=home').page, 'donate');
  assert.equal(parseRoute('#/library').page, 'library');
  for (const hash of ['#/donate/unknown', '#/donate%2Funknown', '#/not-found', '#/quiz/%E0%A4%A'])
    assert.equal(parseRoute(hash).page, 'library');
  const quiz = parseRoute('#/quiz/aws-ace/practice?resume=1&question=0001');
  assert.equal(quiz.quizId, 'gcp-ace');
  assert.equal(quiz.params.get('question'), '0001');
});

test('public entry prefers dark, honors valid saved appearance and tolerates blocked storage', () => {
  const storage = (value) => ({ getItem: () => value });
  for (const hash of ['', '#/', '#/donate']) {
    assert.equal(readDarkMode(storage(null), hash, false), true);
    assert.equal(readDarkMode(storage('light'), hash, true), false);
    assert.equal(readDarkMode(storage('invalid'), hash, false), true);
  }
  assert.equal(readDarkMode(storage(null), '#/library', false), false);
  assert.equal(readDarkMode(storage(null), '#/quiz/aws-aip-c01', true), true);
  assert.equal(
    readDarkMode(
      {
        getItem() {
          throw new Error('blocked');
        },
      },
      '#/donate'
    ),
    true
  );
});

test('donation config fails closed and preserves leading-zero account numbers', () => {
  const config = {
    enabled: true,
    bank: 'Fixture Bank',
    bankBin: '000000',
    accountName: 'TEST FIXTURE',
    accountNumber: '00000000000',
    transferNote: 'TEST ONLY',
    qrAsset: 'donate/fixture.png',
  };
  assert.equal(validDonation(config), true);
  assert.equal(validDonation({ ...config, enabled: false }), false);
  for (const change of [
    { accountNumber: 123 },
    { accountNumber: '' },
    { bankBin: 'bad' },
    { accountName: '' },
    { qrAsset: '../secret.png' },
    { transferNote: '<script>' },
  ])
    assert.equal(validDonation({ ...config, ...change }), false);
  assert.equal(validDonation(null), false);
});
