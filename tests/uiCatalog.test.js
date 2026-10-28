import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { quizzes, findQuiz, FEATURED_QUIZ_IDS, PROVIDERS } from '../src/data/quizzes.js';
import { createHash } from 'node:crypto';
import { translate, vi } from '../src/i18n/messages.js';
import {
  canonicalQuizHash,
  parseRoute,
  quizUrl,
  resolveLoadedQuiz,
} from '../src/utils/navigation.js';
import { LANGUAGE_KEY, readPreferredLanguage } from '../src/i18n/preferences.js';
import { questionFormats } from '../src/data/questionFormats.js';
import { validateQuizQuestions } from '../src/utils/questionModel.js';
import { providerBrands, getProviderBrand } from '../src/data/providerBrands.js';

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

test('exam codes match the reviewed provider catalog without changing stored quiz identities', async () => {
  const audit = JSON.parse(
    await readFile(new URL('../docs/catalog-code-audit-2026-10-28.json', import.meta.url), 'utf8')
  );
  assert.equal(audit.entries.length, quizzes.length);
  assert.equal(new Set(audit.entries.map((entry) => entry.id)).size, quizzes.length);
  for (const entry of audit.entries) {
    const quiz = quizzes.find((item) => item.id === entry.id);
    assert.ok(quiz, entry.id);
    assert.equal(quiz.code, entry.code, entry.id);
    assert.ok(quiz.name.endsWith(`(${entry.code})`), entry.id);
    assert.equal(new URL(audit.sources[entry.source]).protocol, 'https:');
    assert.equal(parseRoute(quizUrl(entry.id, 'practice')).quizId, entry.id);
  }
  assert.equal(findQuiz('aws-ace').id, 'gcp-ace');
  assert.ok(quizzes.find((quiz) => quiz.id === 'anthropic-cca-f').aliases.includes('CCA-F'));
  assert.ok(quizzes.find((quiz) => quiz.id === 'gcp-pcde').aliases.includes('PCDE'));
});

test('the catalog contains unique question banks and the mislabeled AWS copy only resolves as Google ACE', async () => {
  const hashes = new Map();
  for (const quiz of quizzes) {
    const questions = JSON.parse(
      await readFile(new URL('../public/' + quiz.file, import.meta.url), 'utf8')
    );
    const hash = createHash('sha256').update(JSON.stringify(questions)).digest('hex');
    assert.equal(hashes.has(hash), false, `${quiz.id} duplicates ${hashes.get(hash)}`);
    hashes.set(hash, quiz.id);
  }
  assert.equal(quizzes.length, 20);
  assert.equal(quizzes.filter((quiz) => quiz.category === 'AWS').length, 4);
  assert.equal(
    quizzes.some((quiz) => quiz.code === 'CLF-C02' || quiz.id === 'aws-ace'),
    false
  );
  assert.equal(findQuiz('aws-ace'), findQuiz('gcp-ace'));
  const legacy = await readFile(new URL('../public/quiz/AWS/AWS-ACE.json', import.meta.url));
  const canonical = await readFile(new URL('../public/quiz/Google/GCP-ACE.json', import.meta.url));
  assert.deepEqual(legacy, canonical, 'Alias migration is only valid for the identical bank');
});

test('legacy ACE links keep their mode and every query parameter while resolving Google ACE', () => {
  for (const mode of ['', '/practice', '/exam', '/summary']) {
    const oldHash =
      '#/quiz/aws-ace' + mode + '?resume=1&entry=100&fresh=250&time=60&count=50&question=17';
    const next = canonicalQuizHash(oldHash);
    assert.equal(next, oldHash.replace('aws-ace', 'gcp-ace'));
    assert.equal(parseRoute(oldHash).quizId, 'gcp-ace');
    assert.equal(parseRoute(next).params.toString(), parseRoute(oldHash).params.toString());
  }
  assert.equal(quizUrl('aws-ace', 'practice'), '#/quiz/gcp-ace/practice');
  assert.equal(
    canonicalQuizHash('#/quiz/%61ws-ace/exam?fresh=100'),
    '#/quiz/gcp-ace/exam?fresh=100'
  );
  assert.equal(canonicalQuizHash('#/quiz/%E0%A4%A'), '#/quiz/%E0%A4%A');
  assert.equal(canonicalQuizHash('#/my-quizzes?quiz=aws-ace'), '#/my-quizzes?quiz=aws-ace');
});

test('every provider resolves to a local, valid icon and unknown providers have a safe fallback', async () => {
  assert.deepEqual(Object.keys(providerBrands).sort(), [...PROVIDERS].sort());
  assert.equal(
    new Set(Object.values(providerBrands).map((brand) => brand.id)).size,
    PROVIDERS.length
  );
  for (const provider of PROVIDERS) {
    const brand = getProviderBrand(provider);
    const bytes = await readFile(new URL('../public/' + brand.icon, import.meta.url));
    const signature = bytes.subarray(0, brand.icon.endsWith('.ico') ? 4 : 8).toString('hex');
    assert.equal(
      signature,
      brand.icon.endsWith('.ico') ? '00000100' : '89504e470d0a1a0a',
      provider
    );
    assert.ok(brand.initials && bytes.length > 100, provider);
  }
  assert.equal(getProviderBrand(undefined), null);
  assert.equal(getProviderBrand({}), null);
  assert.equal(getProviderBrand('__proto__'), null);
  assert.equal(getProviderBrand('Custom quiz'), null);
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
