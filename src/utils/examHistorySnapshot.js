import {
  isStructuredQuestion,
  isAnswerComplete,
  isAnswerCorrect,
  partOptions,
  questionParts,
  questionType,
  validateQuizQuestions,
} from './questionModel.js';
import { UUID_PATTERN } from './secureId.js';
import { historyError } from './examHistoryErrors.js';
import { contentHash } from './contentHash.js';
import {
  EXAM_HISTORY_SCHEMA,
  EXAM_GRADING_VERSION,
  MAX_HISTORY_BYTES,
  MAX_HISTORY_PAYLOAD_BYTES,
  MAX_HISTORY_QUESTIONS,
} from '../data/examHistoryLimits.js';

export const HISTORY_SUMMARY_FIELDS = [
  'schemaVersion',
  'attemptId',
  'source',
  'startedAt',
  'endedAt',
  'elapsedMs',
  'feedbackMode',
  'gradingVersion',
  'endReason',
  'questionCount',
  'correct',
  'incorrect',
  'unanswered',
  'passed',
  'payloadHash',
];
const SOURCE_FIELDS = [
  'kind',
  'id',
  'title',
  'fingerprint',
  'slotId',
  'instanceId',
  'contentVersion',
];
const SNAPSHOT_FIELDS = HISTORY_SUMMARY_FIELDS.filter((field) => field !== 'payloadHash').concat([
  'questions',
  'answers',
  'outcomes',
]);
const record = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) =>
  record(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const whole = (value) => Number.isSafeInteger(value) && value >= 0;
const hash = (value) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const sortedRecord = (value) =>
  Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
const invalid = () => {
  throw historyError('INVALID');
};

export function validateHistorySummary(value) {
  if (
    !exactKeys(value, HISTORY_SUMMARY_FIELDS) ||
    value.schemaVersion !== EXAM_HISTORY_SCHEMA ||
    typeof value.attemptId !== 'string' ||
    !UUID_PATTERN.test(value.attemptId) ||
    !hash(value.payloadHash)
  )
    invalid();
  const source = value.source;
  if (
    !exactKeys(source, SOURCE_FIELDS) ||
    !['bank', 'custom'].includes(source.kind) ||
    typeof source.id !== 'string' ||
    typeof source.title !== 'string' ||
    !source.title.trim() ||
    source.title.length > 240 ||
    !hash(source.fingerprint)
  )
    invalid();
  if (source.kind === 'bank') {
    if (
      typeof source.id !== 'string' ||
      !/^[a-z0-9-]{1,120}$/.test(source.id) ||
      source.slotId !== null ||
      source.instanceId !== null ||
      source.contentVersion !== null
    )
      invalid();
  } else if (
    !UUID_PATTERN.test(source.id || '') ||
    source.instanceId !== source.id ||
    !['slot-1', 'slot-2', 'slot-3'].includes(source.slotId) ||
    !Number.isSafeInteger(source.contentVersion) ||
    source.contentVersion < 1
  )
    invalid();
  if (
    !whole(value.endedAt) ||
    (value.startedAt !== null && (!whole(value.startedAt) || value.startedAt > value.endedAt)) ||
    value.elapsedMs !== (value.startedAt === null ? null : value.endedAt - value.startedAt)
  )
    invalid();
  if (
    !['standard', 'learning'].includes(value.feedbackMode) ||
    typeof value.gradingVersion !== 'string' ||
    !/^quizmos-score-v\d+$/.test(value.gradingVersion) ||
    !['submitted', 'expired'].includes(value.endReason) ||
    typeof value.passed !== 'boolean'
  )
    invalid();
  if (
    !whole(value.questionCount) ||
    value.questionCount < 1 ||
    value.questionCount > MAX_HISTORY_QUESTIONS ||
    ![value.correct, value.incorrect, value.unanswered].every(whole) ||
    value.correct + value.incorrect + value.unanswered !== value.questionCount
  )
    invalid();
  if (
    value.gradingVersion === EXAM_GRADING_VERSION &&
    value.passed !== value.correct * 100 > value.questionCount * 80
  )
    invalid();
  return value;
}

export function archivedAnswer(question, value) {
  if (!isStructuredQuestion(question)) {
    const answer = value == null ? [] : typeof value === 'string' ? [value] : value;
    if (
      !Array.isArray(answer) ||
      new Set(answer).size !== answer.length ||
      !answer.every((key) => typeof key === 'string' && Object.hasOwn(question.options, key))
    )
      invalid();
    return [...answer].sort();
  }
  const answer = value ?? {};
  if (
    !record(answer) ||
    !Object.entries(answer).every(
      ([id, key]) =>
        questionParts(question).some((part) => part.id === id) &&
        typeof key === 'string' &&
        Object.hasOwn(partOptions(question, id), key)
    )
  )
    invalid();
  return sortedRecord(answer);
}

export function archivedQuestion(question) {
  const copy = Object.fromEntries(
    ['id', 'type', 'question', 'imageUrl', 'layout', 'instruction', 'template']
      .filter((key) => question[key] != null)
      .map((key) => [key, question[key]])
  );
  // Preserve option insertion order: it is the order the learner saw in Exam.
  copy.options = JSON.parse(JSON.stringify(question.options));
  copy.answer = Array.isArray(question.answer)
    ? [...question.answer].sort()
    : sortedRecord(question.answer);
  if (questionType(question) === 'yes_no')
    copy.statements = question.statements.map(({ id, text }) => ({ id, text }));
  if (questionType(question) === 'dropdown')
    copy.slots = question.slots.map(({ id, label }) => ({
      id,
      ...(label == null ? {} : { label }),
    }));
  return copy;
}

export async function encodeHistorySnapshot(base, questions, answers) {
  if (base.gradingVersion !== EXAM_GRADING_VERSION) invalid();
  if (
    !Array.isArray(questions) ||
    !questions.length ||
    questions.length > MAX_HISTORY_QUESTIONS ||
    !Array.isArray(answers) ||
    answers.length !== questions.length
  )
    invalid();
  const snapshotQuestions = questions.map(archivedQuestion);
  validateQuizQuestions(snapshotQuestions, { allowLegacyIncomplete: true });
  const selected = snapshotQuestions.map((question, index) =>
    archivedAnswer(question, answers[index])
  );
  const outcomes = questions.map((question, index) => ({
    complete: isAnswerComplete(question, answers[index]),
    correct: isAnswerCorrect(question, answers[index]),
  }));
  const correct = outcomes.filter((outcome) => outcome.correct).length;
  const answered = outcomes.filter((outcome) => outcome.complete).length;
  const summary = {
    ...base,
    questionCount: questions.length,
    correct,
    incorrect: answered - correct,
    unanswered: questions.length - answered,
    passed: correct * 100 > questions.length * 80,
  };
  validateHistorySummary({ ...summary, payloadHash: '0'.repeat(64) });
  const payload = JSON.stringify({
    ...summary,
    questions: snapshotQuestions,
    answers: selected,
    outcomes,
  });
  if (
    new TextEncoder().encode(payload).length > MAX_HISTORY_PAYLOAD_BYTES ||
    new TextEncoder().encode(
      JSON.stringify({
        payload,
        payloadHash: '0'.repeat(64),
        attemptId: base.attemptId,
        schemaVersion: EXAM_HISTORY_SCHEMA,
      })
    ).length > MAX_HISTORY_BYTES
  )
    throw historyError('SIZE');
  const payloadHash = await contentHash(payload);
  return {
    summary: { ...summary, payloadHash },
    snapshot: {
      schemaVersion: EXAM_HISTORY_SCHEMA,
      attemptId: base.attemptId,
      payloadHash,
      payload,
    },
  };
}

export async function decodeHistorySnapshot(summary, envelope) {
  validateHistorySummary(summary);
  if (
    !exactKeys(envelope, ['schemaVersion', 'attemptId', 'payloadHash', 'payload']) ||
    envelope.schemaVersion !== EXAM_HISTORY_SCHEMA ||
    envelope.attemptId !== summary.attemptId ||
    envelope.payloadHash !== summary.payloadHash ||
    typeof envelope.payload !== 'string'
  )
    invalid();
  if (
    new TextEncoder().encode(envelope.payload).length > MAX_HISTORY_PAYLOAD_BYTES ||
    new TextEncoder().encode(JSON.stringify(envelope)).length > MAX_HISTORY_BYTES ||
    (await contentHash(envelope.payload)) !== summary.payloadHash
  )
    invalid();
  let payload;
  try {
    payload = JSON.parse(envelope.payload);
  } catch {
    invalid();
  }
  if (!exactKeys(payload, SNAPSHOT_FIELDS)) invalid();
  for (const key of HISTORY_SUMMARY_FIELDS.filter((field) => field !== 'payloadHash')) {
    const normalize = (value) => (record(value) ? sortedRecord(value) : value);
    if (JSON.stringify(normalize(payload[key])) !== JSON.stringify(normalize(summary[key])))
      invalid();
  }
  if (
    !Array.isArray(payload.questions) ||
    payload.questions.length !== summary.questionCount ||
    !Array.isArray(payload.answers) ||
    payload.answers.length !== summary.questionCount ||
    !Array.isArray(payload.outcomes) ||
    payload.outcomes.length !== summary.questionCount
  )
    invalid();
  try {
    validateQuizQuestions(payload.questions, { allowLegacyIncomplete: true });
  } catch {
    invalid();
  }
  const fields = [
    'id',
    'type',
    'question',
    'imageUrl',
    'layout',
    'instruction',
    'template',
    'options',
    'answer',
    'statements',
    'slots',
  ];
  for (const [index, question] of payload.questions.entries()) {
    if (Object.keys(question).some((key) => !fields.includes(key))) invalid();
    if (
      (question.statements != null && !Array.isArray(question.statements)) ||
      (question.slots != null && !Array.isArray(question.slots))
    )
      invalid();
    if (
      question.statements?.some((part) => !exactKeys(part, ['id', 'text'])) ||
      question.slots?.some(
        (part) =>
          !record(part) ||
          !Object.hasOwn(part, 'id') ||
          Object.keys(part).some((key) => !['id', 'label'].includes(key))
      )
    )
      invalid();
    if (!isStructuredQuestion(question) && !Array.isArray(payload.answers[index])) invalid();
    archivedAnswer(question, payload.answers[index]);
    const outcome = payload.outcomes[index];
    if (
      !exactKeys(outcome, ['complete', 'correct']) ||
      typeof outcome.complete !== 'boolean' ||
      typeof outcome.correct !== 'boolean' ||
      (outcome.correct && !outcome.complete)
    )
      invalid();
  }
  if (
    payload.outcomes.filter((outcome) => outcome.correct).length !== summary.correct ||
    payload.outcomes.filter((outcome) => !outcome.complete).length !== summary.unanswered
  )
    invalid();
  // Deliberately preserve archived outcomes; never invoke today's scorer here.
  return payload;
}
