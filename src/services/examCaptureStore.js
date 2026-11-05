import { canArchiveExam, createHistoryAttempt } from '../utils/examHistory.js';
import { normalizeHistoryError } from '../utils/examHistoryErrors.js';
import { validateHistorySummary } from '../utils/examHistorySnapshot.js';

export function createExamCaptureStore(service, { prepare = createHistoryAttempt } = {}) {
  let state = {
    uid: null,
    attemptId: null,
    status: 'local',
    reason: 'disabled',
    summary: null,
    error: null,
  };
  let enabled = false,
    epoch = 0,
    pending = null;
  const listeners = new Set();
  const publish = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const current = (uid, version, id) =>
    enabled && state.uid === uid && epoch === version && state.attemptId === id;
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    activate(uid, nextEnabled) {
      if (state.uid === (uid || null) && enabled === !!nextEnabled) return;
      epoch++;
      enabled = !!nextEnabled;
      pending = null;
      publish({
        uid: uid || null,
        attemptId: null,
        status: 'local',
        reason: !enabled ? 'disabled' : uid ? 'older' : 'guest',
        summary: null,
        error: null,
      });
    },
    async capture(session, questions, { retry = false } = {}) {
      const uid = state.uid,
        id = session.attemptId,
        version = epoch;
      if (uid && session.historyOwner && session.historyOwner !== uid) {
        publish({
          attemptId: null,
          status: 'local',
          reason: 'account',
          error: null,
          summary: null,
        });
        return;
      }
      if (!enabled || !canArchiveExam(session, uid)) {
        const reason = !enabled
          ? 'disabled'
          : !uid
            ? 'guest'
            : !session.historySource
              ? 'upload'
              : !session.captureHistory
                ? 'older'
                : 'active';
        publish({
          attemptId: id || null,
          status: session.submitted ? 'local' : 'idle',
          reason,
          error: null,
          summary: null,
        });
        return;
      }
      if (
        state.attemptId === id &&
        !retry &&
        ['saving', 'saved', 'error', 'deleted'].includes(state.status)
      )
        return pending;
      publish({ attemptId: id, status: 'saving', reason: null, error: null, summary: null });
      const task = (async () => {
        try {
          const attempt = await prepare(session, uid, questions);
          if (!current(uid, version, id)) return;
          const summary = await service.save(uid, attempt);
          validateHistorySummary(summary);
          if (summary.attemptId !== id)
            throw Object.assign(new Error('Unexpected history identity'), {
              code: 'HISTORY_INVALID',
            });
          if (current(uid, version, id)) publish({ status: 'saved', summary, error: null });
        } catch (error) {
          if (current(uid, version, id)) {
            const failure = normalizeHistoryError(error);
            publish({
              status: failure.code === 'HISTORY_DELETED' ? 'deleted' : 'error',
              error: failure,
            });
          }
        } finally {
          if (current(uid, version, id)) pending = null;
        }
      })();
      pending = task;
      return task;
    },
  };
}
