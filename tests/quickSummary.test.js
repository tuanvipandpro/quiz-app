import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import deduplication from './fixtures/anthropicDeduplication.json' with { type: 'json' };
import { getQuickSummary } from '../src/data/quickSummaries.js';
import {
  fingerprintQuestions,
  validateSummaryMetadata,
  parseSummaryMarkdown,
  loadQuickSummary,
} from '../src/services/quickSummary.js';

const assets = [
  { quizId: 'anthropic-ccar-p', bank: 'Anthropic/CCAR_P.json', label: 'CCAR-P' },
  { quizId: 'anthropic-cca-f', bank: 'Anthropic/CCA_F.json', label: 'CCA-F' },
  { quizId: 'anthropic-ccao-f', bank: 'Anthropic/CCAO_F.json', label: 'CCAO-F' },
  { quizId: 'anthropic-ccdv-f', bank: 'Anthropic/CCDV_F.json', label: 'CCDV-F' },
  { quizId: 'aws-aip-c01', bank: 'AWS/AIP_C01.json', label: 'AIP-C01' },
].map((asset) => ({
  ...asset,
  questions: JSON.parse(
    fs.readFileSync(new URL('../public/quiz/' + asset.bank, import.meta.url), 'utf8')
  ),
  meta: JSON.parse(
    fs.readFileSync(
      new URL('../public/summaries/' + asset.quizId + '/meta.json', import.meta.url),
      'utf8'
    )
  ),
  markdown: fs.readFileSync(
    new URL('../public/summaries/' + asset.quizId + '/vi.md', import.meta.url),
    'utf8'
  ),
}));
const { quizId, meta, markdown } = assets[0];
const reviewedIds = new Set(meta.topics.flatMap((topic) => topic.questionIds));
const questions = assets[0].questions.filter((question) => reviewedIds.has(String(question.id)));

function fetchFixture(asset = assets[0]) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => structuredClone(asset.meta),
      text: async () => asset.markdown,
    };
  };
  return { calls, fetchImpl };
}

for (const { quizId, questions, meta, markdown, label } of assets) {
  test(`published ${label} guide preserves its reviewed source snapshot and valid question references`, async () => {
    assert.equal(validateSummaryMetadata(meta, quizId), meta);
    const document = parseSummaryMarkdown(markdown, meta.topics);
    assert.equal(document.sections.length, 8);
    const ids = new Set(questions.map((question) => question.id));
    const references = new Set(document.sections.flatMap((section) => section.questionIds));
    assert.ok([...references].every((id) => ids.has(id)));
    const cleanup = deduplication.banks.find((bank) => bank.quizId === quizId);
    const reviewedContentChanged = ['anthropic-cca-f', 'anthropic-ccao-f'].includes(quizId);
    if (cleanup) {
      // Keep the historical review evidence; remapping links is not a new content review.
      assert.equal(meta.sourceQuizHash, cleanup.reviewedSourceHash);
      assert.equal(meta.sourceQuestionCount, cleanup.reviewedSourceQuestionCount);
    }
    assert.equal(references.size, cleanup?.currentGuideReferenceCount ?? meta.sourceQuestionCount);
    const currentReferenceHash = await fingerprintQuestions(
      questions.filter((question) => references.has(String(question.id)))
    );
    assert.equal(currentReferenceHash !== meta.sourceQuizHash, reviewedContentChanged);
    assert.ok(
      markdown.split(/\s+/).length < 1600,
      'Keep the quick guide within a short reading session'
    );
  });
}

test('question and option reordering keep the guide current; changed answers or wording mark it stale', async () => {
  const reordered = [...questions].reverse().map((question) => ({
    ...question,
    options: Object.fromEntries(Object.entries(question.options).reverse()),
    answer: [...question.answer].reverse(),
  }));
  assert.equal(await fingerprintQuestions(reordered), meta.sourceQuizHash);
  reordered[0] = { ...reordered[0], question: 'Updated wording' };
  assert.notEqual(await fingerprintQuestions(reordered), meta.sourceQuizHash);
  const changedAnswer = structuredClone(questions);
  changedAnswer[0].answer = ['A'];
  assert.notEqual(await fingerprintQuestions(changedAnswer), meta.sourceQuizHash);
});

test('no guide is exposed for other quizzes, uploads, or inherited object keys', async () => {
  for (const id of [null, 'az-900', 'uploaded-file', 'constructor', '__proto__'])
    assert.equal(getQuickSummary(id), null);
  const { calls, fetchImpl } = fetchFixture();
  await assert.rejects(
    loadQuickSummary({ quizId: 'unknown', questions, fetchImpl }),
    /No Quick Summary/
  );
  assert.equal(calls.length, 0);
});

test('draft/mismatched metadata and unsafe content paths never load a guide', () => {
  for (const patch of [
    { status: 'draft' },
    { quizId: 'another-quiz' },
    { contentFile: '../secret.md' },
    { contentFile: 'https://example.com/guide.md' },
    { sourceQuizHash: 'missing' },
    { topics: [meta.topics[0], meta.topics[0]] },
    { sources: [{ title: 'Unsafe', url: 'javascript:alert(1)' }] },
  ])
    assert.throws(() => validateSummaryMetadata({ ...meta, ...patch }, quizId));
});

test('empty or missing/mismatched Markdown topics fail visibly instead of displaying a partial guide', () => {
  assert.throws(() => parseSummaryMarkdown(' ', meta.topics), /empty/);
  assert.throws(
    () =>
      parseSummaryMarkdown(markdown.replace('## Kiến trúc & tích hợp', '## Renamed'), meta.topics),
    /match/
  );
  assert.throws(
    () => parseSummaryMarkdown(markdown.slice(0, markdown.indexOf('## Bảo mật')), meta.topics),
    /match/
  );
  const fenced = 'Intro\n```md\n## Example inside a fence\n```\n## Real topic\nUseful text';
  assert.equal(
    parseSummaryMarkdown(fenced, [{ id: 'real', title: 'Real topic' }]).sections.length,
    1
  );
});

test('guide requests honor deployment base paths and pass cancellation to both fetches', async () => {
  for (const asset of assets) {
    for (const baseUrl of ['/', '/quiz-app/', '/quiz-app']) {
      const { calls, fetchImpl } = fetchFixture(asset);
      const controller = new AbortController();
      const guide = await loadQuickSummary({
        quizId: asset.quizId,
        questions: asset.questions,
        baseUrl,
        signal: controller.signal,
        fetchImpl,
      });
      const prefix = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      assert.equal(calls[0].url, prefix + 'summaries/' + asset.quizId + '/meta.json');
      assert.equal(calls[1].url, prefix + 'summaries/' + asset.quizId + '/vi.md');
      assert.ok(calls.every((call) => call.options.signal === controller.signal));
      assert.equal(
        guide.sourceChanged,
        (await fingerprintQuestions(asset.questions)) !== asset.meta.sourceQuizHash
      );
      assert.equal(guide.meta.quizId, asset.quizId);
    }
  }
});

test('published guides reject another quiz’s metadata before requesting its Markdown', async () => {
  for (const target of assets)
    for (const wrong of assets.filter((asset) => asset.quizId !== target.quizId)) {
      const { calls, fetchImpl } = fetchFixture(wrong);
      await assert.rejects(
        loadQuickSummary({ quizId: target.quizId, questions: target.questions, fetchImpl }),
        /metadata/
      );
      assert.equal(calls.length, 1, 'Reject a different quiz before requesting its Markdown');
    }
});

test('failed metadata/content loads reject and a later retry can recover', async () => {
  await assert.rejects(
    loadQuickSummary({ quizId, questions, fetchImpl: async () => ({ ok: false }) }),
    /Could not load/
  );
  let request = 0;
  await assert.rejects(
    loadQuickSummary({
      quizId,
      questions,
      fetchImpl: async () =>
        ++request === 1 ? { ok: true, json: async () => meta } : { ok: false },
    }),
    /content/
  );
  await assert.rejects(
    loadQuickSummary({
      quizId,
      questions,
      fetchImpl: async () => ({ ok: true, json: async () => ({ ...meta, status: 'draft' }) }),
    }),
    /metadata/
  );
  const { fetchImpl } = fetchFixture();
  assert.equal((await loadQuickSummary({ quizId, questions, fetchImpl })).sections.length, 8);
});

test('changed or removed questions preserve the guide with a stale-source signal', async () => {
  const { fetchImpl } = fetchFixture();
  const guide = await loadQuickSummary({ quizId, questions: questions.slice(1), fetchImpl });
  assert.equal(guide.sourceChanged, true);
  assert.equal(guide.sections.length, 8);
});
