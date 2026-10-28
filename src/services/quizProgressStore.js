import { normalizeProgress } from '../utils/quizProgress.js';
import { canonicalQuizId } from '../data/quizAliases.js';

// One store per mounted App. Request/session tokens prevent old reads and writes
// from replacing a newer checkpoint or another account's state.
export function createQuizProgressStore(service, now = Date.now) {
  let state = { uid: null, progress: {}, loading: false, error: null, pendingQuiz: null };
  let session = 0;
  let readRequest = 0;
  const listeners = new Set();
  const publish = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const changedSession = () =>
    Object.assign(new Error('Your account changed. Please retry.'), { code: 'SESSION_CHANGED' });

  async function reload() {
    const uid = state.uid,
      started = session,
      request = ++readRequest;
    if (!uid) return;
    publish({ loading: true, error: null });
    try {
      const progress = normalizeProgress(await service.getAllQuizProgress(uid));
      if (started === session && request === readRequest) publish({ progress, loading: false });
    } catch {
      if (started === session && request === readRequest) {
        publish({
          loading: false,
          error: 'Could not load saved progress. Retry to check your checkpoints.',
        });
      }
    }
  }

  async function update(quizId, checkpoint) {
    quizId = canonicalQuizId(quizId);
    const uid = state.uid,
      started = session;
    if (!uid) throw new Error('Please login to save your progress.');
    if (state.pendingQuiz) throw new Error('Please wait for the current progress update.');
    publish({ pendingQuiz: quizId });
    try {
      const result = checkpoint
        ? await service.saveQuizProgress(
            uid,
            quizId,
            checkpoint.questionIndex,
            checkpoint.questionId
          )
        : await service.clearQuizProgress(uid, quizId);
      if (started !== session) throw changedSession();
      if (!result?.success)
        throw new Error(
          checkpoint
            ? 'Could not save progress. Please retry.'
            : 'Could not remove saved progress. Please retry.'
        );
      // A read started before this confirmed write must not overwrite it.
      readRequest++;
      const progress = { ...state.progress };
      if (checkpoint) progress[quizId] = { ...checkpoint, quizId, savedAt: now() };
      else delete progress[quizId];
      publish({ progress, loading: false, error: null });
    } finally {
      if (started === session) publish({ pendingQuiz: null });
    }
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setUser(uid) {
      session++;
      readRequest++;
      publish({ uid: uid || null, progress: {}, loading: !!uid, error: null, pendingQuiz: null });
      return reload();
    },
    reload,
    save: (quizId, questionIndex, questionId) => update(quizId, { questionIndex, questionId }),
    remove: (quizId) => update(quizId, null),
  };
}
