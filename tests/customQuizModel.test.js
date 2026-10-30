import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createCustomCandidate,
  validateCustomQuestions,
  parseCustomQuizJSON,
  checkCustomQuizSize,
  readCustomQuiz,
  cloudQuizId,
  parseCloudQuizId,
  customDraftId,
  assertCustomIdentity,
  normalizeCustomError,
} from '../src/utils/customQuizModel.js';
import { MAX_CUSTOM_QUIZ_BYTES } from '../src/data/customQuizLimits.js';

const sample = (type = 'single') =>
  JSON.parse(
    fs.readFileSync(new URL(`../public/examples/quiz-${type}.json`, import.meta.url), 'utf8')
  );
const instance = '00000000-0000-4000-8000-000000000001';
const candidate = () => createCustomCandidate(' Sample ', sample(), instance);

test('custom content accepts 1/100 questions and all shared question formats', () => {
  for (const type of ['single', 'multiple', 'yes-no', 'dropdown-rows', 'dropdown-inline']) {
    const questions = sample(type);
    assert.equal(createCustomCandidate('Example', questions).questionCount, 1);
    const hundred = Array.from({ length: 100 }, (_, index) => ({ ...questions[0], id: index }));
    assert.equal(createCustomCandidate('Example', hundred).questionCount, 100);
  }
  assert.equal(candidate().title, 'Sample');
});

test('invalid imports retain actionable question-specific reasons', () => {
  for (const value of [[], Array.from({ length: 101 }, (_, id) => ({ ...sample()[0], id })), {}])
    assert.throws(() => validateCustomQuestions(value), { code: 'CUSTOM_INVALID' });
  assert.throws(() => parseCustomQuizJSON('{'), /not valid JSON/);
  assert.throws(() => validateCustomQuestions([sample()[0], sample()[0]]), /Question 2: duplicate/);
  assert.throws(() => createCustomCandidate(' ', sample()), /1–160/);
  assert.throws(() => createCustomCandidate('x'.repeat(161), sample()), /1–160/);
  assert.throws(
    () => validateCustomQuestions([{ ...sample()[0], answer: ['missing'] }]),
    /Question 1:/
  );
  assert.throws(
    () => validateCustomQuestions([{ ...sample('yes-no')[0], answer: {} }]),
    /Question 1:/
  );
});

test('save budget counts serialized UTF-8 bytes, including Unicode and envelope overhead', () => {
  const value = candidate();
  const bytes = checkCustomQuizSize(value);
  value.questions[0].explanation = 'a'.repeat(MAX_CUSTOM_QUIZ_BYTES - bytes - 17);
  assert.ok(checkCustomQuizSize(value) <= MAX_CUSTOM_QUIZ_BYTES);
  value.questions[0].explanation += '漢';
  assert.throws(() => checkCustomQuizSize(value), { code: 'CUSTOM_SIZE' });
  assert.throws(
    () =>
      createCustomCandidate('Big', [
        { ...sample()[0], question: 'x'.repeat(MAX_CUSTOM_QUIZ_BYTES) },
      ]),
    { code: 'CUSTOM_SIZE' }
  );
});

test('cloud routes and drafts distinguish slot occupants and content versions', () => {
  const value = { ...candidate(), slotId: 'slot-1' };
  const id = cloudQuizId(value.slotId, value.instanceId);
  assert.deepEqual(parseCloudQuizId(id), { slotId: value.slotId, instanceId: value.instanceId });
  assert.notEqual(customDraftId(value), customDraftId({ ...value, contentVersion: 2 }));
  assert.notEqual(
    customDraftId(value),
    customDraftId({ ...value, instanceId: crypto.randomUUID() })
  );
  for (const bad of [
    'custom',
    'aws-ace',
    'cloud:slot-4:' + instance,
    'cloud:slot-1:bad',
    id + ':extra',
  ])
    assert.equal(parseCloudQuizId(bad), null);
});

test('stored invalid nested content is never exposed to study, but can be replaced or deleted', () => {
  assert.throws(() => readCustomQuiz('slot-1', { ...candidate(), title: {} }, 'alice'), {
    code: 'CUSTOM_INVALID',
  });
  const valid = readCustomQuiz('slot-1', candidate(), 'alice');
  assert.equal(valid.kind, 'cloud-custom');
  assert.equal(valid.owner, 'alice');
  for (const patch of [
    {
      checkpoint: {
        instanceId: instance,
        contentVersion: 1,
        questionIndex: 100,
        questionId: 'undefined',
        savedAt: 0,
      },
    },
    { questions: [] },
    { questionCount: 99 },
    { questions: [{ ...sample()[0], answer: [] }] },
  ]) {
    const invalid = readCustomQuiz('slot-1', { ...candidate(), ...patch }, 'alice');
    assert.equal(invalid.invalid, true);
    assert.deepEqual(invalid.questions, []);
    assert.equal(invalid.instanceId, instance);
  }
});

test('stale writes compare revision, while checkpoint writes survive rename only', () => {
  const expected = candidate();
  const renamed = { ...expected, revision: 2 };
  assert.throws(() => assertCustomIdentity(renamed, expected), { code: 'CUSTOM_CONFLICT' });
  assert.doesNotThrow(() => assertCustomIdentity(renamed, expected, { checkpoint: true }));
  for (const next of [
    null,
    { ...expected, instanceId: crypto.randomUUID() },
    { ...expected, contentVersion: 2 },
  ])
    assert.throws(() => assertCustomIdentity(next, expected, { checkpoint: true }), {
      code: 'CUSTOM_CONFLICT',
    });
});

test('service failures are normalized without exposing remote details', () => {
  assert.equal(
    normalizeCustomError({
      code: 'invalid-argument',
      message: 'Property array contains an invalid nested entity.',
    }).code,
    'CUSTOM_REJECTED'
  );
  assert.equal(
    normalizeCustomError({ code: 'permission-denied', message: 'private detail' }).code,
    'CUSTOM_PERMISSION'
  );
  assert.equal(
    normalizeCustomError({ code: 'invalid-argument', message: 'Document size too large' }).code,
    'CUSTOM_SIZE'
  );
  assert.equal(normalizeCustomError(new Error('offline')).code, 'CUSTOM_NETWORK');
  assert.equal(normalizeCustomError({ code: 'unauthenticated' }).code, 'CUSTOM_AUTH');
});
