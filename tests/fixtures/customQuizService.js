// UI-only service double. Ownership/quota/transactions are verified against the
// real SDK + Rules in tests/firestore/customQuizzes.test.js, not by this fixture.
import { CUSTOM_QUIZ_SLOTS } from '../../src/data/customQuizLimits.js';
import {
  assertCustomIdentity,
  checkCustomQuizSize,
  createCustomCandidate,
  customQuizError,
  readCustomQuiz,
  customQuizTitle,
  validateCustomQuestions,
} from '../../src/utils/customQuizModel.js';

const key = (uid) => `quiz-e2e-custom:${uid}`;
const listeners = new Set();
const read = (uid) => JSON.parse(localStorage.getItem(key(uid)) || '{}');
const records = (uid) =>
  Object.entries(read(uid)).map(([slot, data]) => readCustomQuiz(slot, data, uid));
const check = (method, uid) => {
  const user = JSON.parse(localStorage.getItem('quiz-e2e-auth') || 'null');
  if (!uid || user?.uid !== uid) throw customQuizError('AUTH');
  const failure = sessionStorage.getItem(`quiz-e2e-custom-fail-${method}`);
  if (failure) {
    sessionStorage.removeItem(`quiz-e2e-custom-fail-${method}`);
    throw customQuizError(failure);
  }
};
const write = (uid, values) => {
  localStorage.setItem(key(uid), JSON.stringify(values));
  listeners.forEach((receive) => receive());
};
const mutate = (method, uid, expected, change, checkpoint = false) => {
  check(method, uid);
  const values = read(uid),
    current = values[expected.slotId];
  assertCustomIdentity(current, expected, { checkpoint });
  const next = change(current);
  if (next) {
    checkCustomQuizSize(next);
    values[expected.slotId] = next;
  } else delete values[expected.slotId];
  write(uid, values);
  return expected.slotId;
};
export default {
  async list(uid) {
    check('list', uid);
    return records(uid);
  },
  subscribe(uid, receive, fail) {
    const publish = () => {
      try {
        receive(records(uid));
      } catch (error) {
        fail(error);
      }
    };
    listeners.add(publish);
    const changed = (event) => {
      if (event.key === key(uid)) publish();
    };
    window.addEventListener('storage', changed);
    return () => {
      listeners.delete(publish);
      window.removeEventListener('storage', changed);
    };
  },
  async create(uid, input) {
    check('create', uid);
    const candidate = createCustomCandidate(input.title, input.questions, input.instanceId);
    const values = read(uid);
    const committed = Object.keys(values).find(
      (slot) => values[slot].instanceId === candidate.instanceId
    );
    if (committed) return committed;
    const slot = CUSTOM_QUIZ_SLOTS.find((id) => !values[id]);
    if (!slot) throw customQuizError('QUOTA');
    values[slot] = { ...candidate, createdAt: Date.now(), updatedAt: Date.now() };
    write(uid, values);
    if (sessionStorage.getItem('quiz-e2e-custom-lose-response')) {
      sessionStorage.removeItem('quiz-e2e-custom-lose-response');
      throw customQuizError('NETWORK');
    }
    return slot;
  },
  async rename(uid, expected, title) {
    return mutate('rename', uid, expected, (old) => ({
      ...old,
      title: customQuizTitle(title),
      revision: old.revision + 1,
      updatedAt: Date.now(),
    }));
  },
  async replace(uid, expected, input) {
    return mutate('replace', uid, expected, (old) => ({
      ...old,
      title: customQuizTitle(input.title),
      questions: validateCustomQuestions(input.questions),
      questionCount: input.questions.length,
      contentVersion: old.contentVersion + 1,
      revision: old.revision + 1,
      checkpoint: null,
      updatedAt: Date.now(),
    }));
  },
  async remove(uid, expected) {
    return mutate('remove', uid, expected, () => null);
  },
  async checkpoint(uid, expected, questionIndex, questionId) {
    return mutate(
      'checkpoint',
      uid,
      expected,
      (old) => ({
        ...old,
        checkpoint: {
          instanceId: old.instanceId,
          contentVersion: old.contentVersion,
          questionIndex,
          questionId: String(questionId),
          savedAt: Date.now(),
        },
        updatedAt: Date.now(),
      }),
      true
    );
  },
};
