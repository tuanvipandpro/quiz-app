import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { emptyAnswer, hasAnyAnswer, isAnswerComplete, isAnswerCorrect, formatAnswerLines, formatQuestionText, shuffleQuestionOptions, validateQuizQuestions } from '../src/utils/questionModel.js';
import { mergeQuizQuestions, questionSignature } from '../src/utils/quizImport.js';
import { explanationPrompt } from '../src/services/llm/explanationPrompt.js';
import { fingerprintQuestions } from '../src/services/quickSummary.js';

const read = name => JSON.parse(fs.readFileSync(new URL('../public/quiz/Anthropic/' + name + '.json', import.meta.url), 'utf8'));
const bank = read('CCAR_P');
const yesNo = bank.find(q => q.type === 'yes_no');
const dropdown = bank.find(q => q.type === 'dropdown' && q.layout === 'rows');
const inline = bank.find(q => q.type === 'dropdown' && q.layout === 'inline');
const mc = { id: 'a', question: 'Choose one', options: { A: 'First', B: 'Second' }, answer: ['B'] };

test('every built-in bank remains loadable with legacy placeholder compatibility', () => {
  const root = new URL('../public/quiz/', import.meta.url);
  let count = 0;
  for (const folder of fs.readdirSync(root)) {
    const directory = new URL(folder + '/', root);
    for (const file of fs.readdirSync(directory).filter(file => file.endsWith('.json'))) {
      validateQuizQuestions(JSON.parse(fs.readFileSync(new URL(file, directory), 'utf8')), { allowLegacyIncomplete: true });
      count++;
    }
  }
  assert.equal(count, 21);
});

test('all imported banks validate and include six dropdown and five yes-no questions', () => {
  for (const [file, count] of [['CCA_F',201], ['CCAR_P',157], ['CCAO_F',151], ['CCDV_F',96]]) {
    const questions = read(file);
    assert.equal(validateQuizQuestions(questions), questions);
    assert.equal(questions.length, count);
    assert.equal(new Set(questions.map(q => q.id)).size, count);
  }
  assert.equal(bank.filter(q => q.type === 'yes_no').length, 5);
  assert.equal(bank.filter(q => q.type === 'dropdown').length, 6);
  assert.deepEqual(bank.slice(0, 63).map(q => q.id), Array.from({ length: 64 }, (_, index) => index + 1).filter(id => id !== 56).map(id => 'ccar-p-' + id));
});

for (const question of [yesNo, dropdown, inline]) {
  test(`${question.type}/${question.layout || 'statements'} requires every part and scores the entire question`, () => {
    const keys = Object.keys(question.answer);
    const partial = { ...question.answer }; delete partial[keys[0]];
    assert.deepEqual(emptyAnswer(question), {});
    assert.equal(hasAnyAnswer(question, {}), false);
    assert.equal(isAnswerComplete(question, partial), false);
    assert.equal(isAnswerCorrect(question, partial), false);
    assert.equal(isAnswerCorrect(question, question.answer), true);
    assert.equal(isAnswerCorrect(question, { ...question.answer, extra: 'A' }), false);
    assert.equal(isAnswerComplete(question, { ...question.answer, [keys[0]]: null }), false);
    const wrong = { ...question.answer, [keys[0]]: question.answer[keys[0]] === 'A' ? 'B' : 'A' };
    assert.equal(isAnswerComplete(question, wrong), true);
    assert.equal(isAnswerCorrect(question, wrong), false);
  });
}

test('single and multiple choice completion still rejects invalid keys, duplicates, and excess choices', () => {
  assert.equal(emptyAnswer(mc), null);
  assert.equal(isAnswerCorrect(mc, 'B'), true);
  assert.equal(isAnswerComplete(mc, 'X'), false);
  const multi = { ...mc, answer: ['A','B'] };
  assert.deepEqual(emptyAnswer(multi), []);
  assert.equal(isAnswerCorrect(multi, ['B','A']), true);
  for (const value of [[], ['A'], ['A','A'], ['A','B','X']]) assert.equal(isAnswerComplete(multi, value), false);
});

test('invalid mappings, missing/duplicate parts, unsupported layouts and bad inline templates are rejected', () => {
  for (const patch of [
    { answer: {} }, { answer: { ...dropdown.answer, unknown: 'A' } },
    { slots: [dropdown.slots[0], dropdown.slots[0]] }, { layout: 'unknown' },
    { options: { ...dropdown.options, [dropdown.slots[0].id]: { A: 'Only one choice' } } },
  ]) assert.throws(() => validateQuizQuestions([{ ...dropdown, ...patch }]));
  for (const template of ['', '{{unknown}}', '{{slot-1}} {{slot-1}}']) assert.throws(() => validateQuizQuestions([{ ...inline, template }]));
  assert.throws(() => validateQuizQuestions([{ ...yesNo, options: { A: 'True', B: 'False' } }]));
  assert.throws(() => validateQuizQuestions([{ ...mc, answer: ['missing'] }]));
  for (const type of [false, 0, null, '', 'unknown']) assert.throws(() => validateQuizQuestions([{ ...mc, type }]));
  const legacy = { ...mc, options: {}, answer: [] };
  assert.doesNotThrow(() => validateQuizQuestions([legacy], { allowLegacyIncomplete: true }));
  assert.throws(() => validateQuizQuestions([legacy]));
  assert.throws(() => validateQuizQuestions([{ ...yesNo, answer: {} }], { allowLegacyIncomplete: true }));
});

test('shuffling preserves keys, row IDs, answer meaning and source objects', () => {
  for (const q of [mc, yesNo, dropdown, inline]) {
    const snapshot = structuredClone(q);
    const shuffled = shuffleQuestionOptions(q, () => 0.1);
    assert.deepEqual(q, snapshot);
    assert.deepEqual(shuffled.answer, q.answer);
    assert.deepEqual(formatAnswerLines(shuffled, q.answer), formatAnswerLines(q, q.answer));
    assert.ok(isAnswerCorrect(shuffled, Array.isArray(q.answer) && q.answer.length === 1 ? q.answer[0] : q.answer));
  }
});

test('Copy and Explain contain all labels/options and no object stringification', () => {
  for (const q of [yesNo, dropdown, inline]) {
    const copy = formatQuestionText(q);
    const prompt = explanationPrompt(q);
    assert.ok(copy.includes(q.question));
    assert.ok(!copy.includes('Đáp án được đánh dấu'));
    assert.ok(prompt.includes(formatAnswerLines(q, q.answer, { showKeys: true })[0]));
    assert.ok(!prompt.includes('[object Object]'));
    for (const part of q.statements || q.slots) assert.ok(copy.includes(part.text || part.label || 'Blank'));
    assert.equal(formatAnswerLines(q, {}).filter(line => line.includes('Not answered')).length, Object.keys(q.answer).length);
  }
});

test('structured prompt/cache identity and bank fingerprints include rows, labels, choices and answers', async () => {
  const changed = structuredClone(dropdown);
  changed.slots[0].label += ' changed';
  assert.notEqual(explanationPrompt(changed), explanationPrompt(dropdown));
  assert.notEqual(await fingerprintQuestions([changed]), await fingerprintQuestions([dropdown]));
  const optionReorder = { ...dropdown, options: Object.fromEntries(Object.entries(dropdown.options).reverse()) };
  assert.equal(await fingerprintQuestions([optionReorder]), await fingerprintQuestions([dropdown]));
});

test('merging skips reordered/renumbered copies, preserves existing IDs, and is idempotent', () => {
  const existing = [mc];
  const duplicate = { ...mc, id: 'new-id', options: { B: 'Second', A: 'First' } };
  const fresh = { ...mc, question: 'A different question' };
  const result = mergeQuizQuestions(existing, [duplicate, fresh]);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.added.length, 1);
  assert.equal(result.questions[0], mc);
  assert.equal(result.questions[1].id, 'a-import-1');
  assert.equal(mergeQuizQuestions(result.questions, [duplicate, fresh]).added.length, 0);
});

test('reviewed paraphrases are explicit and answer differences do not silently replace the existing answer', () => {
  const paraphrase = { ...mc, id: 'other', question: 'Select an option', answer: ['A'] };
  const reviewed = new Map([[questionSignature(paraphrase), questionSignature(mc)]]);
  assert.equal(mergeQuizQuestions([mc], [paraphrase]).added.length, 1);
  const result = mergeQuizQuestions([mc], [paraphrase], reviewed);
  assert.equal(result.skipped[0].answerTextDiffers, true);
  assert.deepEqual(result.questions[0].answer, ['B']);
});

test('different numeric constraints, negations, and changed statement content are not deduplicated', () => {
  const a = { ...mc, question: 'Must latency be < 800 ms?' };
  const b = { ...mc, id: 'b', question: 'Must latency be > 800 ms?' };
  assert.equal(mergeQuizQuestions([a], [b]).added.length, 1);
  assert.notEqual(questionSignature({ ...mc, question: 'Is it allowed?' }), questionSignature({ ...mc, question: 'Is it not allowed?' }));
  const changed = structuredClone(yesNo); changed.statements[0].text = 'A different claim';
  assert.notEqual(questionSignature(yesNo), questionSignature(changed));
});
