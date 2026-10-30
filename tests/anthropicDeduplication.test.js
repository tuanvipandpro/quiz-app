import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import review from './fixtures/anthropicDeduplication.json' with { type: 'json' };
import { questionSignature } from '../src/utils/quizImport.js';
import { isAnswerCorrect, shuffleQuestionOptions } from '../src/utils/questionModel.js';
import { resolveCheckpoint } from '../src/utils/quizProgress.js';

const read = (bank) =>
  JSON.parse(fs.readFileSync(new URL(`../public/quiz/Anthropic/${bank}.json`, import.meta.url)));

for (const { bank, removed, retiredSignatures } of review.banks) {
  test(`${bank} retains canonical IDs and excludes reviewed duplicates even when re-IDed`, () => {
    const questions = read(bank);
    const ids = new Set(questions.map((question) => String(question.id)));
    for (const [retired, retained] of Object.entries(removed)) {
      assert.ok(!ids.has(retired), `Retired duplicate ${retired}`);
      assert.ok(ids.has(retained), `Missing retained question ${retained}`);
    }
    const signatures = new Set();
    for (const question of questions) {
      const signature = createHash('sha256').update(questionSignature(question)).digest('hex');
      assert.ok(!retiredSignatures.includes(signature), `Reintroduced duplicate ${question.id}`);
      assert.ok(!signatures.has(signature), `Duplicate question/choices ${question.id}`);
      signatures.add(signature);
    }
  });

  test(`${bank} checkpoints follow retained IDs and safely handle retired IDs`, () => {
    const questions = read(bank);
    for (const [retired, retained] of Object.entries(removed)) {
      const checkpoint = { questionId: retained, questionIndex: 999 };
      const resolved = resolveCheckpoint(questions, checkpoint);
      assert.equal(String(questions[resolved.index].id), retained);
      assert.equal(
        checkpoint.questionIndex,
        999,
        'Do not rewrite saved progress during resolution'
      );
      const fallback = resolveCheckpoint(questions, { questionId: retired, questionIndex: 999 });
      assert.equal(fallback.index, questions.length - 1);
      assert.equal(fallback.adjusted, true);
    }
  });
}

test('use-case assessment checks sensitive data before approval and documents the outcome afterwards', () => {
  const question = read('CCAO_F').find((question) => question.id === 'ccao-f-105');
  assert.match(question.question, /2\. Identify the data types/);
  assert.match(question.question, /4\. Decide whether/);
  assert.match(question.question, /5\. Document the assessment outcome/);
  assert.equal(question.options[question.answer[0]], '1, 2, 3, 4, 5');
  assert.match(question.explanation, /Data sensitivity is an input/);
  assert.match(question.explanation, /https:\/\/www.anthropic.com\/legal\/aup/);
  for (const key of Object.keys(question.options)) {
    assert.equal(isAnswerCorrect(question, key), question.options[key] === '1, 2, 3, 4, 5');
  }
  const shuffled = shuffleQuestionOptions(question, () => 0.2);
  assert.equal(shuffled.options[shuffled.answer[0]], '1, 2, 3, 4, 5');
  assert.ok(isAnswerCorrect(shuffled, shuffled.answer[0]));
});

test('the complete five-part use-case question and shared coverage across certifications remain', () => {
  assert.equal(read('CCAR_P').find((q) => q.id === 'ccar-p-38-import-1').slots.length, 5);
  assert.ok(read('CCA_F').some((q) => q.id === '51'));
  assert.ok(read('CCAO_F').some((q) => q.id === 'ccao-f-151'));
  assert.ok(read('CCAR_P').some((q) => q.id === 'ccar-p-10-import-1'));
  assert.ok(read('CCAO_F').some((q) => q.id === 'ccao-f-38'));
});
