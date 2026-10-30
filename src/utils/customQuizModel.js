import { validateQuizQuestions } from './questionModel.js';
import {
  CUSTOM_QUIZ_SLOTS,
  MAX_CUSTOM_QUESTIONS,
  MAX_CUSTOM_TITLE,
  MAX_CUSTOM_QUIZ_BYTES,
} from '../data/customQuizLimits.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const customQuizError = (code, detail) =>
  Object.assign(new Error(detail || code), { code: `CUSTOM_${code}`, detail });

export function validateCustomQuestions(questions) {
  if (!Array.isArray(questions) || !questions.length || questions.length > MAX_CUSTOM_QUESTIONS)
    throw customQuizError('INVALID', 'A quiz must contain 1–100 questions.');
  try {
    validateQuizQuestions(questions);
  } catch (error) {
    throw customQuizError('INVALID', error.message);
  }
  return questions;
}

export function customQuizTitle(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > MAX_CUSTOM_TITLE)
    throw customQuizError('INVALID', 'Enter a quiz name with 1–160 characters.');
  return value.trim();
}

export function checkCustomQuizSize(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value)).length;
  if (bytes > MAX_CUSTOM_QUIZ_BYTES) throw customQuizError('SIZE');
  return bytes;
}

export function createCustomCandidate(title, questions, instanceId = crypto.randomUUID()) {
  if (!UUID.test(instanceId)) throw customQuizError('INVALID', 'Invalid quiz identity.');
  const candidate = {
    instanceId,
    title: customQuizTitle(title),
    questions: validateCustomQuestions(questions),
    questionCount: questions.length,
    contentVersion: 1,
    revision: 1,
    checkpoint: null,
    createdAt: 0,
    updatedAt: 0,
  };
  checkCustomQuizSize(candidate);
  return candidate;
}

export function parseCustomQuizJSON(text) {
  let questions;
  try {
    questions = JSON.parse(text);
  } catch {
    throw customQuizError('INVALID', 'The file is not valid JSON. Check its syntax and try again.');
  }
  return validateCustomQuestions(questions);
}

export function cloudQuizId(slotId, instanceId) {
  if (!CUSTOM_QUIZ_SLOTS.includes(slotId) || !UUID.test(instanceId))
    throw customQuizError('INVALID', 'Invalid quiz identity.');
  return `cloud:${slotId}:${instanceId}`;
}

export function parseCloudQuizId(value) {
  if (typeof value !== 'string' || !value.startsWith('cloud:')) return null;
  const [prefix, slotId, instanceId, extra] = value.split(':');
  if (
    prefix !== 'cloud' ||
    extra ||
    !CUSTOM_QUIZ_SLOTS.includes(slotId) ||
    !UUID.test(instanceId || '')
  )
    return null;
  return { slotId, instanceId };
}

export const customDraftId = (quiz) =>
  `${cloudQuizId(quiz.slotId, quiz.instanceId)}:v${quiz.contentVersion}`;

export function assertCustomIdentity(current, expected, { checkpoint = false } = {}) {
  if (
    !current ||
    current.instanceId !== expected.instanceId ||
    (checkpoint
      ? current.contentVersion !== expected.contentVersion
      : current.revision !== expected.revision)
  )
    throw customQuizError('CONFLICT');
}

export function readCustomQuiz(slotId, data, uid) {
  const id = cloudQuizId(slotId, data?.instanceId || '');
  if (
    !Number.isInteger(data.revision) ||
    data.revision < 1 ||
    !Number.isInteger(data.contentVersion) ||
    data.contentVersion < 1
  )
    throw customQuizError('INVALID', 'Saved quiz metadata is invalid.');
  const title = customQuizTitle(data.title);
  const quiz = { ...data, id, slotId, owner: uid, kind: 'cloud-custom', title, name: title };
  try {
    validateCustomQuestions(data.questions);
    if (data.questionCount !== data.questions.length) throw customQuizError('INVALID');
    checkCustomQuizSize(data);
    if (data.checkpoint) {
      const c = data.checkpoint;
      if (
        c.instanceId !== data.instanceId ||
        c.contentVersion !== data.contentVersion ||
        !Number.isInteger(c.questionIndex) ||
        c.questionIndex < 0 ||
        c.questionIndex >= data.questions.length ||
        String(data.questions[c.questionIndex]?.id) !== c.questionId
      )
        throw customQuizError('INVALID', 'Saved checkpoint is invalid.');
    }
    return quiz;
  } catch (error) {
    // Invalid nested content must never reach a renderer. Owners can replace/delete it.
    return { ...quiz, questions: [], checkpoint: null, invalid: true, detail: error.detail };
  }
}

export function normalizeCustomError(error) {
  if (error?.code?.startsWith('CUSTOM_')) return error;
  if (error?.code?.includes('permission-denied')) return customQuizError('PERMISSION');
  if (error?.code?.includes('unauthenticated')) return customQuizError('AUTH');
  if (/size|too large|maximum.*bytes/i.test(error?.message || '')) return customQuizError('SIZE');
  if (error?.code?.includes('invalid-argument')) return customQuizError('REJECTED');
  return customQuizError('NETWORK');
}

export const CUSTOM_QUIZ_MESSAGES = {
  CUSTOM_REJECTED:
    'The server rejected this quiz. Check its format and reduce its size, then retry.',
  CUSTOM_AUTH: 'Sign in to save and manage your private quizzes.',
  CUSTOM_QUOTA: 'All 3 quiz slots are used. Replace or delete a saved quiz to make room.',
  CUSTOM_CONFLICT: 'This quiz changed in another tab. Reload your saved quizzes and try again.',
  CUSTOM_SIZE: 'This quiz is too large to save. Reduce its content to under 750 KiB and retry.',
  CUSTOM_PERMISSION:
    'Saving is not permitted. Check your account or contact the app owner, then retry.',
  CUSTOM_NETWORK: 'Could not reach your saved quizzes. Check your connection and retry.',
  CUSTOM_BUSY: 'Please wait for the current quiz update.',
  CUSTOM_SESSION_CHANGED: 'Your account changed. Please retry.',
  CUSTOM_INVALID: 'This quiz is invalid. Check the file and retry.',
};
