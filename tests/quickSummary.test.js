import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getQuickSummary } from '../src/data/quickSummaries.js';
import { fingerprintQuestions, validateSummaryMetadata, parseSummaryMarkdown, loadQuickSummary } from '../src/services/quickSummary.js';

const quizId = 'anthropic-ccar-p';
const questions = JSON.parse(fs.readFileSync(new URL('../public/quiz/Anthropic/CCAR_P.json', import.meta.url), 'utf8'));
const meta = JSON.parse(fs.readFileSync(new URL('../public/summaries/anthropic-ccar-p/meta.json', import.meta.url), 'utf8'));
const markdown = fs.readFileSync(new URL('../public/summaries/anthropic-ccar-p/vi.md', import.meta.url), 'utf8');

function fetchFixture() {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => structuredClone(meta), text: async () => markdown };
  };
  return { calls, fetchImpl };
}

test('published CCAR-P guide covers the bank with valid topic references and current content fingerprint', async () => {
  assert.equal(validateSummaryMetadata(meta, quizId), meta);
  assert.equal(meta.sourceQuestionCount, questions.length);
  assert.equal(meta.sourceQuizHash, await fingerprintQuestions(questions));
  const document = parseSummaryMarkdown(markdown, meta.topics);
  assert.equal(document.sections.length, 8);
  const ids = new Set(questions.map(question => question.id));
  const references = new Set(document.sections.flatMap(section => section.questionIds));
  assert.deepEqual([...references].sort(), [...ids].sort());
  assert.ok(markdown.split(/\s+/).length < 1600, 'Keep the quick guide within a short reading session');
});

test('question and option reordering keep the guide current; changed answers or wording mark it stale', async () => {
  const reordered = [...questions].reverse().map(question => ({
    ...question, options: Object.fromEntries(Object.entries(question.options).reverse()), answer: [...question.answer].reverse(),
  }));
  assert.equal(await fingerprintQuestions(reordered), meta.sourceQuizHash);
  reordered[0] = { ...reordered[0], question: 'Updated wording' };
  assert.notEqual(await fingerprintQuestions(reordered), meta.sourceQuizHash);
  const changedAnswer = structuredClone(questions);
  changedAnswer[0].answer = ['A'];
  assert.notEqual(await fingerprintQuestions(changedAnswer), meta.sourceQuizHash);
});

test('no guide is exposed for other quizzes, uploads, or inherited object keys', async () => {
  for (const id of [null, 'anthropic-cca-f', 'uploaded-file', 'constructor', '__proto__']) assert.equal(getQuickSummary(id), null);
  const { calls, fetchImpl } = fetchFixture();
  await assert.rejects(loadQuickSummary({ quizId: 'unknown', questions, fetchImpl }), /No Quick Summary/);
  assert.equal(calls.length, 0);
});

test('draft/mismatched metadata and unsafe content paths never load a guide', () => {
  for (const patch of [
    { status: 'draft' }, { quizId: 'another-quiz' }, { contentFile: '../secret.md' },
    { contentFile: 'https://example.com/guide.md' }, { sourceQuizHash: 'missing' },
    { topics: [meta.topics[0], meta.topics[0]] },
    { sources: [{ title: 'Unsafe', url: 'javascript:alert(1)' }] },
  ]) assert.throws(() => validateSummaryMetadata({ ...meta, ...patch }, quizId));
});

test('empty or missing/mismatched Markdown topics fail visibly instead of displaying a partial guide', () => {
  assert.throws(() => parseSummaryMarkdown(' ', meta.topics), /empty/);
  assert.throws(() => parseSummaryMarkdown(markdown.replace('## Kiến trúc & tích hợp', '## Renamed'), meta.topics), /match/);
  assert.throws(() => parseSummaryMarkdown(markdown.slice(0, markdown.indexOf('## Bảo mật')), meta.topics), /match/);
  const fenced = 'Intro\n```md\n## Example inside a fence\n```\n## Real topic\nUseful text';
  assert.equal(parseSummaryMarkdown(fenced, [{ id: 'real', title: 'Real topic' }]).sections.length, 1);
});

test('guide requests honor deployment base paths and pass cancellation to both fetches', async () => {
  for (const baseUrl of ['/', '/quiz-app/', '/quiz-app']) {
    const { calls, fetchImpl } = fetchFixture();
    const controller = new AbortController();
    const guide = await loadQuickSummary({ quizId, questions, baseUrl, signal: controller.signal, fetchImpl });
    const prefix = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    assert.equal(calls[0].url, prefix + 'summaries/anthropic-ccar-p/meta.json');
    assert.equal(calls[1].url, prefix + 'summaries/anthropic-ccar-p/vi.md');
    assert.ok(calls.every(call => call.options.signal === controller.signal));
    assert.equal(guide.sourceChanged, false);
  }
});

test('failed metadata/content loads reject and a later retry can recover', async () => {
  await assert.rejects(loadQuickSummary({ quizId, questions, fetchImpl: async () => ({ ok: false }) }), /Could not load/);
  let request = 0;
  await assert.rejects(loadQuickSummary({ quizId, questions, fetchImpl: async () => ++request === 1
    ? { ok: true, json: async () => meta } : { ok: false } }), /content/);
  await assert.rejects(loadQuickSummary({ quizId, questions, fetchImpl: async () => ({ ok: true, json: async () => ({ ...meta, status: 'draft' }) }) }), /metadata/);
  const { fetchImpl } = fetchFixture();
  assert.equal((await loadQuickSummary({ quizId, questions, fetchImpl })).sections.length, 8);
});

test('changed or removed questions preserve the guide with a stale-source signal', async () => {
  const { fetchImpl } = fetchFixture();
  const guide = await loadQuickSummary({ quizId, questions: questions.slice(1), fetchImpl });
  assert.equal(guide.sourceChanged, true);
  assert.equal(guide.sections.length, 8);
});
