import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { quizzes, FEATURED_QUIZ_IDS, PROVIDERS } from '../src/data/quizzes.js';
import { translate, vi } from '../src/i18n/messages.js';
import { parseRoute, quizUrl, resolveLoadedQuiz } from '../src/utils/navigation.js';
import { LANGUAGE_KEY, readPreferredLanguage } from '../src/i18n/preferences.js';
import { questionFormats } from '../src/data/questionFormats.js';
import { validateQuizQuestions } from '../src/utils/questionModel.js';

test('library metadata matches actual question files and featured cards resolve to the canonical quiz', async () => {
  assert.equal(new Set(quizzes.map((quiz) => quiz.id)).size, quizzes.length);
  assert.equal(new Set(FEATURED_QUIZ_IDS).size, FEATURED_QUIZ_IDS.length);
  for (const id of FEATURED_QUIZ_IDS) assert.ok(quizzes.find((quiz) => quiz.id === id));
  for (const quiz of quizzes) {
    const questions = JSON.parse(
      await readFile(new URL('../public/' + quiz.file, import.meta.url), 'utf8')
    );
    assert.equal(quiz.totalQuestions, questions.length, quiz.id);
    assert.ok(PROVIDERS.includes(quiz.category), quiz.id);
  }
});

test('English is the default while an explicit saved VN/EN choice is respected', () => {
  assert.equal(readPreferredLanguage(null), 'en');
  assert.equal(readPreferredLanguage({ getItem: () => null }), 'en');
  assert.equal(readPreferredLanguage({ getItem: () => 'fr' }), 'en');
  assert.equal(
    readPreferredLanguage({
      getItem() {
        throw new Error('Storage unavailable');
      },
    }),
    'en'
  );
  for (const language of ['vi', 'en'])
    assert.equal(
      readPreferredLanguage({ getItem: (key) => (key === LANGUAGE_KEY ? language : null) }),
      language
    );
});

test('every inline guide example matches its download and passes the upload validator', async () => {
  assert.equal(new Set(questionFormats.map((format) => format.id)).size, questionFormats.length);
  for (const format of questionFormats) {
    const downloaded = JSON.parse(JSON.stringify(format.questions));
    assert.ok(Array.isArray(downloaded) && downloaded.length > 0 && downloaded.length <= 100);
    assert.doesNotThrow(() => validateQuizQuestions(downloaded), format.id);
    const file = JSON.parse(
      await readFile(new URL(`../public/examples/quiz-${format.id}.json`, import.meta.url), 'utf8')
    );
    assert.deepEqual(file, downloaded, format.id);
  }
  assert.ok(questionFormats.some((format) => format.questions[0].layout === 'inline'));
  assert.ok(questionFormats.some((format) => format.questions[0].type === 'yes_no'));
});

test('Vietnamese messages preserve interpolation fields and English content is not translated', () => {
  for (const [key, value] of Object.entries(vi))
    assert.deepEqual(
      [...key.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort(),
      [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort(),
      key
    );
  assert.equal(
    translate('vi', 'Question {number} of {total}', { number: 2, total: 100 }),
    'Câu 2 / 100'
  );
  assert.equal(
    translate('en', 'Question {number} of {total}', { number: 2, total: 100 }),
    'Question 2 of 100'
  );
  assert.equal(
    translate('vi', 'A question supplied by the quiz author'),
    'A question supplied by the quiz author'
  );
  assert.equal(translate('en', '{count} quiz sets', { count: 1 }), '1 quiz set');
  assert.equal(
    translate('vi', 'Question 2: duplicate question ID.'),
    'Câu 2: ID câu hỏi bị trùng.'
  );
});

test('quiz links preserve exam configuration and safely handle malformed URLs', () => {
  const route = parseRoute(
    quizUrl('aws-aip-c01', 'exam', { time: '120', count: '60', fresh: 'token' })
  );
  assert.equal(route.quizId, 'aws-aip-c01');
  assert.equal(route.mode, 'exam');
  assert.equal(route.params.get('time'), '120');
  assert.equal(parseRoute('#/my-quizzes').page, 'my-quizzes');
  assert.equal(parseRoute('#/quiz/%E0%A4%A').page, 'library');
  assert.equal(parseRoute('#unknown').page, 'library');
});

test('a fresh library has no active quiz and private uploads never cross accounts', () => {
  assert.equal(resolveLoadedQuiz(null, undefined, null), null);
  const bank = { id: 'aws-aip-c01', questions: [] };
  assert.equal(resolveLoadedQuiz(bank, bank.id, 'alice'), bank);
  assert.equal(resolveLoadedQuiz(bank, 'different-quiz', 'alice'), null);
  const upload = { id: 'custom', owner: 'alice', questions: [] };
  assert.equal(resolveLoadedQuiz(upload, 'custom', 'alice'), upload);
  assert.equal(resolveLoadedQuiz(upload, 'custom', 'bob'), null);
  assert.equal(resolveLoadedQuiz(upload, 'custom', null), null);
});
