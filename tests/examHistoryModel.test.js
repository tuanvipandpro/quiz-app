import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { secureId, UUID_PATTERN } from '../src/utils/secureId.js';
import { contentHash } from '../src/utils/contentHash.js';
import {
  createExamSession,
  finishExam,
  initialStudySession,
  answerExamQuestion,
  sessionKey,
} from '../src/utils/studySession.js';
import {
  examHistorySource,
  canArchiveExam,
  createHistoryAttempt,
  retainedHistoryStats,
} from '../src/utils/examHistory.js';
import { decodeHistorySnapshot, validateHistorySummary } from '../src/utils/examHistorySnapshot.js';
import { cloudQuizId } from '../src/utils/customQuizModel.js';
import { MAX_HISTORY_BYTES } from '../src/data/examHistoryLimits.js';
import { findQuiz } from '../src/data/quizzes.js';

const uid = 'alice';
const source = examHistorySource(
  { kind: 'bank', id: 'gcp-ace', name: 'Untrusted old alias name' },
  uid
);
const example = (format) => JSON.parse(fs.readFileSync(`public/examples/quiz-${format}.json`));
const make = (
  questions,
  {
    feedbackMode = 'standard',
    owner = uid,
    capture = true,
    historySource = source,
    now = 1000,
  } = {}
) =>
  createExamSession(questions, questions.length, 60, {
    now,
    random: () => 0.25,
    feedbackMode,
    historyOwner: owner,
    captureHistory: capture,
    historySource,
  });
const complete = (session) => ({
  ...session,
  answers: session.questions.map((q) =>
    Array.isArray(q.answer) && q.answer.length === 1 ? q.answer[0] : structuredClone(q.answer)
  ),
});

test('secure identities keep native UUIDs and work on HTTP LAN contexts through getRandomValues', () => {
  const native = secureId();
  assert.match(native, UUID_PATTERN);
  const values = Array.from({ length: 20 }, () =>
    secureId({ getRandomValues: (bytes) => crypto.getRandomValues(bytes) })
  );
  assert.equal(new Set(values).size, 20);
  for (const value of values)
    assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.throws(() => secureId(null), /unavailable/);
});

test('native and HTTP-compatible SHA-256 agree with independent vectors, padding boundaries and Unicode', async () => {
  for (const value of [
    '',
    'abc',
    'Câu hỏi 🌏',
    ...[1, 55, 56, 63, 64, 65, 1000, 250000].map((length) => 'éx'.repeat(length)),
  ]) {
    const expected = createHash('sha256').update(value).digest('hex');
    assert.equal(await contentHash(value), expected);
    assert.equal(await contentHash(value, { subtle: null }), expected);
  }
});

test('source eligibility is bank-first/canonical and private instance/version scoped', () => {
  assert.equal(examHistorySource({ kind: 'bank', id: 'aws-ace' }, uid).id, 'gcp-ace');
  assert.equal(
    examHistorySource({ kind: 'bank', id: 'aws-ace' }, uid).title,
    findQuiz('gcp-ace').name
  );
  for (const quiz of [
    { kind: 'bank', id: 'unknown' },
    { kind: 'tab-upload', id: 'custom' },
    {
      kind: 'cloud-custom',
      id: cloudQuizId('slot-1', secureId()),
      owner: 'bob',
      contentVersion: 1,
    },
  ])
    assert.equal(examHistorySource(quiz, uid), null);
  assert.equal(examHistorySource({ kind: 'bank', id: 'gcp-ace' }, null), null);
  const instance = secureId();
  const privateSource = examHistorySource(
    {
      kind: 'cloud-custom',
      id: cloudQuizId('slot-1', instance),
      owner: uid,
      contentVersion: 2,
      name: 'Saved fixture',
    },
    uid
  );
  assert.equal(privateSource.id, instance);
  assert.equal(privateSource.contentVersion, 2);
});

for (const format of ['single', 'multiple', 'yes-no', 'dropdown-rows', 'dropdown-inline'])
  test(`immutable ${format} capture uses shared scoring and preserves the seen context`, async () => {
    const questions = example(format),
      session = complete(make(questions));
    const ended = finishExam(session, 2000, true);
    const { summary, snapshot } = await createHistoryAttempt(ended, uid, questions);
    assert.equal(summary.correct, session.questions.length);
    assert.equal(summary.passed, true);
    assert.equal(summary.elapsedMs, 1000);
    const archive = await decodeHistorySnapshot(summary, snapshot);
    assert.equal(archive.feedbackMode, 'standard');
    assert.deepEqual(archive.questions[0].options, session.questions[0].options);
    assert.deepEqual(
      Object.keys(archive.questions[0].options),
      Object.keys(session.questions[0].options)
    );
    assert.equal(
      Array.isArray(archive.answers[0]),
      !['yes-no', 'dropdown-rows', 'dropdown-inline'].includes(format)
    );
    const reorderedSource = {
      ...summary,
      source: Object.fromEntries(Object.entries(summary.source).reverse()),
    };
    assert.deepEqual(await decodeHistorySnapshot(reorderedSource, snapshot), archive);
  });

test('capture records the strict greater-than-80% policy and incomplete answers separately', async () => {
  const q = example('single')[0];
  const questions = Array.from({ length: 5 }, (_, index) => ({ ...q, id: String(index) }));
  const session = complete(make(questions, { feedbackMode: 'learning' }));
  session.answers[0] = [];
  const { summary } = await createHistoryAttempt(finishExam(session, 2000, true), uid, questions);
  assert.equal(summary.correct, 4);
  assert.equal(summary.unanswered, 1);
  assert.equal(summary.passed, false);
  assert.equal(summary.feedbackMode, 'learning');
  const incomplete = make(example('multiple'));
  incomplete.answers[0] = [incomplete.questions[0].answer[0]];
  const partial = await createHistoryAttempt(
    finishExam(incomplete, 2000, true),
    uid,
    example('multiple')
  );
  assert.equal(partial.summary.incorrect, 0);
  assert.equal(partial.summary.unanswered, 1);
});

test('capture drops source metadata/explanations and rejects altered source content or malformed answers', async () => {
  const questions = example('single').map((q) => ({
    ...q,
    apiKey: 'synthetic-do-not-archive',
    explanation: 'Synthetic generated help',
    statements: { apiKey: 'fixture' },
  }));
  const session = complete(make(questions));
  const data = await createHistoryAttempt(finishExam(session, 2000, true), uid, questions);
  assert.ok(!data.snapshot.payload.includes('synthetic-do-not-archive'));
  assert.ok(!data.snapshot.payload.includes('Synthetic generated help'));
  const changed = structuredClone(session);
  changed.questions[0].question = 'Changed beneath the source identity';
  await assert.rejects(createHistoryAttempt(finishExam(changed, 2000, true), uid, questions), {
    code: 'HISTORY_INVALID',
  });
  session.answers[0] = ['not-a-choice'];
  await assert.rejects(createHistoryAttempt(finishExam(session, 2000, true), uid, questions), {
    code: 'HISTORY_INVALID',
  });
});

test('manual, timer and late-answer finalization preserve identity, deadline, end time and locked answers', () => {
  const questions = example('single'),
    session = make(questions);
  const manual = finishExam(session, 2000, true),
    expired = finishExam(session, session.deadline + 5000),
    late = answerExamQuestion(session, ['A'], session.deadline + 5000);
  for (const value of [manual, expired, late]) {
    assert.equal(value.attemptId, session.attemptId);
    assert.equal(value.deadline, session.deadline);
    assert.equal(finishExam(value, session.deadline + 10000), value);
    assert.equal(answerExamQuestion(value, ['B']), value);
  }
  assert.equal(manual.endedAt, 2000);
  assert.equal(expired.endedAt, session.deadline);
  assert.equal(late.endedAt, session.deadline);
  assert.deepEqual(late.answers, session.answers);
});

test('legacy active migration keeps the draft and unknown duration; completed/disabled/guest drafts do not backfill', async () => {
  const questions = example('single'),
    base = make(questions),
    key = sessionKey(uid, 'gcp-ace', 'exam');
  const legacy = {
    ...base,
    attemptId: undefined,
    startedAt: undefined,
    historyOwner: undefined,
    historySource: undefined,
    captureHistory: undefined,
    gradingVersion: undefined,
  };
  for (const name of [
    'attemptId',
    'startedAt',
    'historyOwner',
    'historySource',
    'captureHistory',
    'gradingVersion',
  ])
    delete legacy[name];
  const store = {
    value: JSON.stringify(legacy),
    getItem() {
      return this.value;
    },
  };
  const options = { historyOwner: uid, historySource: source, captureHistory: true };
  const migrated = initialStudySession(
    store,
    key,
    questions,
    'exam',
    () => {
      throw Error('Must restore');
    },
    options
  );
  assert.match(migrated.attemptId, UUID_PATTERN);
  assert.equal(migrated.startedAt, null);
  assert.deepEqual(migrated.questions, legacy.questions);
  assert.deepEqual(migrated.answers, legacy.answers);
  assert.equal(migrated.deadline, legacy.deadline);
  store.value = JSON.stringify(migrated);
  assert.equal(
    initialStudySession(store, key, questions, 'exam', () => null, options).attemptId,
    migrated.attemptId
  );
  const data = await createHistoryAttempt(finishExam(migrated, 2000, true), uid, questions);
  assert.equal(data.summary.elapsedMs, null);
  store.value = JSON.stringify({ ...legacy, submitted: true });
  const old = initialStudySession(store, key, questions, 'exam', () => null, options);
  assert.equal(canArchiveExam(old, uid), false);
  for (const session of [
    finishExam(make(questions, { capture: false }), 2000, true),
    finishExam(make(questions, { owner: null }), 2000, true),
  ])
    assert.equal(canArchiveExam(session, uid), false);
  await assert.rejects(createHistoryAttempt(finishExam(base, 2000, true), 'bob', questions), {
    code: 'HISTORY_AUTH',
  });
});

test('archive replay preserves stored grading versions/outcomes and rejects corrupt or oversized payloads', async () => {
  const questions = example('single');
  const data = await createHistoryAttempt(
    finishExam(complete(make(questions)), 2000, true),
    uid,
    questions
  );
  const payload = JSON.parse(data.snapshot.payload);
  payload.gradingVersion = 'quizmos-score-v2';
  payload.passed = false;
  const summary = {
    ...data.summary,
    gradingVersion: payload.gradingVersion,
    passed: false,
    payloadHash: await contentHash(JSON.stringify(payload)),
  };
  const snapshot = {
    ...data.snapshot,
    payload: JSON.stringify(payload),
    payloadHash: summary.payloadHash,
  };
  assert.equal((await decodeHistorySnapshot(summary, snapshot)).passed, false);
  await assert.rejects(decodeHistorySnapshot(data.summary, { ...data.snapshot, payload: '{}' }), {
    code: 'HISTORY_INVALID',
  });
  assert.throws(
    () => validateHistorySummary({ ...data.summary, attemptId: [data.summary.attemptId] }),
    { code: 'HISTORY_INVALID' }
  );
  const large = questions.map((q) => ({ ...q, question: '€'.repeat(MAX_HISTORY_BYTES) }));
  await assert.rejects(createHistoryAttempt(finishExam(make(large), 2000, true), uid, large), {
    code: 'HISTORY_SIZE',
  });
});

test('retained statistics use every summary, canonical aliases and private instance rather than slot', async () => {
  const questions = example('single');
  const { summary } = await createHistoryAttempt(
    finishExam(complete(make(questions)), 2000, true),
    uid,
    questions
  );
  const rows = Array.from({ length: 25 }, (_, index) => ({
    ...summary,
    attemptId: secureId(),
    endedAt: 2000 + index,
    source: { ...summary.source, id: index % 2 ? 'aws-ace' : 'gcp-ace' },
  }));
  const first = secureId(),
    second = secureId();
  rows.push(
    ...[first, second].map((instance) => ({
      ...summary,
      source: {
        ...summary.source,
        kind: 'custom',
        id: instance,
        instanceId: instance,
        slotId: 'slot-1',
        contentVersion: 1,
      },
    }))
  );
  const stats = retainedHistoryStats(rows);
  assert.equal(stats.find((group) => group.key === 'bank:gcp-ace').count, 25);
  assert.equal(stats.length, 3);
  assert.equal(stats.find((group) => group.key === 'bank:gcp-ace').last.endedAt, 2024);
});
