import { useEffect, useMemo, useSyncExternalStore } from 'react';
import examHistoryService from '../services/examHistoryService';
import { createExamHistoryStore } from '../services/examHistoryStore.js';
import { EXAM_HISTORY_ENABLED } from '../config/examHistoryConfig';

export function useExamHistory(uid, attemptId = null) {
  const store = useMemo(() => createExamHistoryStore(examHistoryService), []);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    store.activate(uid, EXAM_HISTORY_ENABLED);
    return () => store.activate(null, false);
  }, [store, uid]);
  useEffect(() => {
    if (uid && EXAM_HISTORY_ENABLED) {
      if (attemptId) store.read(attemptId);
      else store.reload();
    }
  }, [store, uid, attemptId]);
  const own = state.uid === (uid || null);
  return {
    ...store,
    ...state,
    ...(!own
      ? {
          summaries: [],
          record: null,
          error: null,
          recordError: null,
          sourceStatus: null,
          pending: null,
          loading: !!uid,
          recordLoading: !!uid,
        }
      : {}),
    reload: () => (attemptId ? store.read(attemptId) : store.reload()),
    ...(own && attemptId && state.readId !== attemptId
      ? { record: null, recordError: null, sourceStatus: null, recordLoading: true }
      : {}),
  };
}
