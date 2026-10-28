import {
  emptyAnswer,
  isAnswerComplete,
  isAnswerCorrect,
  shuffleQuestionOptions,
  validateQuizQuestions,
} from './questionModel.js';
import { canonicalQuizId, QUIZ_ID_ALIASES } from '../data/quizAliases.js';
import { canonicalQuizHash } from './navigation.js';

export const SESSION_PREFIX = 'quiz-study-v1:';

export function questionFingerprint(questions) {
  const text = JSON.stringify(questions);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++)
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36) + ':' + questions.length;
}

export function sessionKey(uid, quizId, mode) {
  return `${SESSION_PREFIX}${uid || 'guest'}:${canonicalQuizId(quizId)}:${mode}`;
}

export function createExamSession(
  questions,
  count,
  minutes,
  now = Date.now(),
  random = Math.random
) {
  if (!questions.length) throw new Error('An exam needs at least one question.');
  const pool = [...questions];
  for (let index = pool.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  const size = Number.isInteger(count) && count > 0 ? count : 50;
  const selected = pool
    .slice(0, Math.min(size, questions.length))
    .map((question) => shuffleQuestionOptions(question, random));
  return {
    signature: questionFingerprint(questions),
    questions: selected,
    answers: selected.map(emptyAnswer),
    index: 0,
    flags: [],
    deadline: now + minutes * 60000,
    submitted: false,
    timeExpired: false,
  };
}

export function initialStudySession(
  storage,
  key,
  questions,
  mode,
  create,
  { fresh = null, initialIndex = null, entryToken = null } = {}
) {
  if (typeof entryToken === 'string') entryToken = canonicalQuizHash(entryToken);
  const restored = readStudySession(storage, key, questions, mode);
  // Back to an older start URL must not replace a newer running draft.
  const olderLink = fresh && restored?.freshToken && Number(fresh) < Number(restored.freshToken);
  const value =
    restored && (!fresh || restored.freshToken === fresh || olderLink) ? restored : create();
  const index =
    initialIndex !== null && value.entryToken !== entryToken
      ? Math.max(0, Math.min(initialIndex, questions.length - 1))
      : value.index;
  return {
    ...value,
    index,
    freshToken: olderLink ? value.freshToken : fresh || value.freshToken,
    entryToken: entryToken || value.entryToken,
  };
}

export function finishExam(session, now = Date.now(), submit = false) {
  if (session.submitted || (!submit && now < session.deadline)) return session;
  return { ...session, submitted: true, timeExpired: now >= session.deadline };
}

export function readStudySession(storage, key, questions, mode) {
  const keys = [key];
  for (const [alias, canonicalId] of Object.entries(QUIZ_ID_ALIASES)) {
    const suffix = `:${canonicalId}:${mode}`;
    if (key.startsWith(SESSION_PREFIX) && key.endsWith(suffix))
      keys.push(key.slice(0, -suffix.length) + `:${alias}:${mode}`);
  }
  let restored = null;
  for (const candidateKey of keys) {
    const candidate = readStoredStudySession(storage, candidateKey, questions, mode);
    if (!candidate) continue;
    if (typeof candidate.entryToken === 'string')
      candidate.entryToken = canonicalQuizHash(candidate.entryToken);
    if (
      !restored ||
      (mode === 'exam' && Number(candidate.freshToken) > Number(restored.freshToken || 0))
    )
      restored = candidate;
  }
  return restored;
}

function readStoredStudySession(storage, key, questions, mode) {
  try {
    const saved = JSON.parse(storage.getItem(key));
    if (
      !saved ||
      saved.signature !== questionFingerprint(questions) ||
      !Number.isInteger(saved.index) ||
      saved.index < 0
    )
      return null;
    if (mode === 'practice') {
      if (
        saved.index >= questions.length ||
        !Array.isArray(saved.answers) ||
        saved.answers.length !== questions.length
      )
        return null;
      return saved;
    }
    if (
      !Array.isArray(saved.questions) ||
      !saved.questions.length ||
      saved.questions.length > questions.length ||
      saved.index >= saved.questions.length ||
      !Array.isArray(saved.answers) ||
      saved.answers.length !== saved.questions.length ||
      !Number.isFinite(saved.deadline) ||
      typeof saved.submitted !== 'boolean' ||
      !Array.isArray(saved.flags) ||
      !saved.flags.every(
        (index) => Number.isInteger(index) && index >= 0 && index < saved.questions.length
      )
    )
      return null;
    const ids = new Set(questions.map((question) => String(question.id)));
    if (!saved.questions.every((question) => ids.has(String(question.id)))) return null;
    validateQuizQuestions(saved.questions, { allowLegacyIncomplete: true });
    return saved;
  } catch {
    return null;
  }
}

export function examStats(session) {
  let correct = 0;
  let answered = 0;
  session.questions.forEach((question, index) => {
    if (isAnswerComplete(question, session.answers[index])) answered++;
    if (isAnswerCorrect(question, session.answers[index])) correct++;
  });
  return {
    correct,
    answered,
    incorrect: answered - correct,
    unanswered: session.questions.length - answered,
  };
}

export function clearStudySessions(storage, uid) {
  try {
    const prefix = `${SESSION_PREFIX}${uid || 'guest'}:`;
    for (const key of Object.keys(storage)) if (key.startsWith(prefix)) storage.removeItem(key);
  } catch {
    /* Browser storage is optional. */
  }
}
