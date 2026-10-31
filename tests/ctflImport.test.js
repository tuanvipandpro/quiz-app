import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { quizzes } from '../src/data/quizzes.js';
import { validateQuizQuestions, isAnswerCorrect } from '../src/utils/questionModel.js';
import { resolveCheckpoint } from '../src/utils/quizProgress.js';

const bank = JSON.parse(
  fs.readFileSync(new URL('../public/quiz/ISTQB/CTFL_V4_0.json', import.meta.url), 'utf8')
);
const review = JSON.parse(
  fs.readFileSync(new URL('./fixtures/ctflImportReview.json', import.meta.url), 'utf8')
);
const question = (id) => bank.find((q) => q.id === id);

test('CTFL refresh is strictly loadable and its catalog includes the reviewed additions', () => {
  assert.equal(validateQuizQuestions(bank), bank);
  assert.equal(bank.length, 276);
  assert.equal(new Set(bank.map((q) => q.id)).size, bank.length);
  assert.equal(quizzes.find((quiz) => quiz.id === 'istqb-ctfl-v4-0').totalQuestions, bank.length);
  assert.deepEqual(
    bank.slice(240).map((q) => q.id),
    review.result.addedIds
  );
});

test('every existing CTFL cloud checkpoint still resolves to the same question and position', () => {
  assert.deepEqual(
    bank.slice(0, 240).map((q) => q.id),
    review.baseline.questionIdsInOrder
  );
  review.baseline.questionIdsInOrder.forEach((id, index) => {
    const result = resolveCheckpoint(bank, { questionId: id, questionIndex: index });
    assert.equal(result.index, index);
    assert.equal(result.adjusted, false);
  });
  assert.match(question('1').question, /automation tool/i);
  assert.match(question('2').question, /help desk worker/i);
  assert.match(question('230').question, /salesperson/i);
  assert.match(question('232').question, /video poker/i);
});

test('restored CTFL placeholders include the actual scenario, choices, and scorable answers', () => {
  assert.equal(Object.keys(question('230').options).length, 4);
  assert.match(question('230').question, /300 and 2000 euros/);
  assert.equal(isAnswerCorrect(question('230'), 'B'), true);
  assert.equal(Object.keys(question('232').options).length, 4);
  assert.match(question('232').question, /3 states\/2 transitions/);
  assert.equal(isAnswerCorrect(question('232'), 'C'), true);
  assert.match(question('97').question, /conditional branches/);
  assert.match(question('162').question, /acceptance criteria/i);
});

test('reviewed answer corrections and retained source disagreements remain explicit', () => {
  for (const decision of review.answerReview) {
    assert.deepEqual(question(decision.existingId).answer, decision.final);
  }
  assert.deepEqual(question('82').answer, ['B', 'C']);
  assert.equal(isAnswerCorrect(question('82'), ['C', 'B']), true);
  assert.equal(isAnswerCorrect(question('82'), ['C', 'E']), false);
  assert.deepEqual(question('83').answer, ['A']);
  assert.deepEqual(question('84').answer, ['A']);
  assert.deepEqual(question('265').answer, ['B']);
  assert.match(question('265').options.B, /risk level/i);
  assert.match(question('265').explanation, /risk level/i);
  assert.equal(question('88').explanation, undefined);
});

test('missing source lists are not fabricated or given unsupported explanations', () => {
  for (const pending of review.unchangedIncomplete) {
    const digest = createHash('sha256')
      .update(JSON.stringify(question(pending.id)))
      .digest('hex');
    assert.equal(digest, pending.sha256);
    assert.equal(question(pending.id).explanation, undefined);
  }
});

test('CTFL uses the refreshed image set and renders decoded comparison operators', () => {
  const illustrated = bank.filter((q) => q.imageUrl);
  assert.equal(illustrated.length, 22);
  assert.equal(new Set(illustrated.map((q) => q.imageUrl)).size, illustrated.length);
  assert.match(question('232').imageUrl, /1783922850496-5ebk8vfl/);
  assert.match(question('84').imageUrl, /1783899742115-jelwm1mj/);
  assert.match(question('19').question, /n < 0/);
  for (const q of bank) assert.doesNotMatch(q.question, /&(?:lt|gt|amp|quot);/);
});
