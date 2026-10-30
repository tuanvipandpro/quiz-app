import {
  collection,
  doc,
  getDocsFromServer,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { CUSTOM_QUIZ_SLOTS } from '../data/customQuizLimits.js';
import {
  assertCustomIdentity,
  checkCustomQuizSize,
  createCustomCandidate,
  customQuizError,
  customQuizTitle,
  normalizeCustomError,
  readCustomQuiz,
  validateCustomQuestions,
} from '../utils/customQuizModel.js';

const stable = (value) =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]])
        )
      : item
  );

/**
 * Private custom-quiz IO. All writes are online transactions; no offline write queue.
 * expected instance/revision prevents a stale tab mutating a reused slot. Checkpoints
 * compare contentVersion instead, so renaming never invalidates learning progress.
 * Lists read content too (at most three documents); call only on personal routes.
 */
export function createCustomQuizService(db) {
  const root = (uid) => {
    if (typeof uid !== 'string' || !uid || uid.includes('/')) throw customQuizError('AUTH');
    return collection(db, 'users', uid, 'customQuizzes');
  };
  const ref = (uid, slotId) => {
    if (!CUSTOM_QUIZ_SLOTS.includes(slotId)) throw customQuizError('INVALID');
    return doc(root(uid), slotId);
  };
  const decode = (uid, snapshot) =>
    snapshot.docs.map((item) => readCustomQuiz(item.id, item.data(), uid));
  const safe =
    (operation) =>
    async (...args) => {
      try {
        return await operation(...args);
      } catch (error) {
        throw normalizeCustomError(error);
      }
    };
  async function mutate(uid, expected, change, { checkpoint = false } = {}) {
    return runTransaction(db, async (tx) => {
      const target = ref(uid, expected.slotId);
      const snapshot = await tx.get(target);
      const current = snapshot.exists() ? snapshot.data() : null;
      assertCustomIdentity(current, expected, { checkpoint });
      const next = change(current);
      if (next === null) tx.delete(target);
      else {
        checkCustomQuizSize(next);
        tx.set(target, next);
      }
      return expected.slotId;
    });
  }
  return {
    list: safe(async (uid) => decode(uid, await getDocsFromServer(root(uid)))),
    subscribe(uid, receive, fail) {
      return onSnapshot(
        root(uid),
        { includeMetadataChanges: true },
        (snapshot) => {
          // Cached/offline data must not revalidate a deleted/replaced quiz for study.
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
          try {
            receive(decode(uid, snapshot));
          } catch (error) {
            fail(normalizeCustomError(error));
          }
        },
        (error) => fail(normalizeCustomError(error))
      );
    },
    create: safe(async (uid, input) => {
      const candidate = createCustomCandidate(input.title, input.questions, input.instanceId);
      return runTransaction(db, async (tx) => {
        const refs = CUSTOM_QUIZ_SLOTS.map((slot) => ref(uid, slot));
        const snapshots = await Promise.all(refs.map((item) => tx.get(item)));
        const committed = snapshots.find(
          (snapshot) => snapshot.exists() && snapshot.data().instanceId === candidate.instanceId
        );
        if (committed) {
          const data = committed.data();
          if (
            data.title !== candidate.title ||
            stable(data.questions) !== stable(candidate.questions)
          )
            throw customQuizError('CONFLICT');
          return committed.id;
        }
        const index = snapshots.findIndex((snapshot) => !snapshot.exists());
        if (index < 0) throw customQuizError('QUOTA');
        tx.set(refs[index], {
          ...candidate,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return CUSTOM_QUIZ_SLOTS[index];
      });
    }),
    rename: safe((uid, expected, title) =>
      mutate(uid, expected, (current) => ({
        ...current,
        title: customQuizTitle(title),
        revision: current.revision + 1,
        updatedAt: serverTimestamp(),
      }))
    ),
    replace: safe((uid, expected, input) => {
      const questions = validateCustomQuestions(input.questions);
      const title = customQuizTitle(input.title);
      return mutate(uid, expected, (current) => ({
        ...current,
        title,
        questions,
        questionCount: questions.length,
        revision: current.revision + 1,
        contentVersion: current.contentVersion + 1,
        checkpoint: null,
        updatedAt: serverTimestamp(),
      }));
    }),
    remove: safe((uid, expected) => mutate(uid, expected, () => null)),
    checkpoint: safe((uid, expected, questionIndex, questionId) =>
      mutate(
        uid,
        expected,
        (current) => {
          if (
            !Number.isInteger(questionIndex) ||
            questionIndex < 0 ||
            String(current.questions[questionIndex]?.id) !== String(questionId)
          )
            throw customQuizError('INVALID', 'Invalid quiz checkpoint.');
          return {
            ...current,
            checkpoint: {
              instanceId: current.instanceId,
              contentVersion: current.contentVersion,
              questionIndex,
              questionId: String(questionId),
              savedAt: serverTimestamp(),
            },
            updatedAt: serverTimestamp(),
          };
        },
        { checkpoint: true }
      )
    ),
  };
}
