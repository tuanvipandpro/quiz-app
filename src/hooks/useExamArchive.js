import { useEffect, useMemo, useSyncExternalStore } from 'react';
import examHistoryService from '../services/examHistoryService';
import { createExamCaptureStore } from '../services/examCaptureStore.js';
import { EXAM_HISTORY_ENABLED } from '../config/examHistoryConfig';

export function useExamArchive(session, uid, questions) {
  const store = useMemo(() => createExamCaptureStore(examHistoryService), []);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    store.activate(uid, EXAM_HISTORY_ENABLED);
    return () => store.activate(null, false);
  }, [store, uid]);
  useEffect(() => {
    store.capture(session, questions);
  }, [store, uid, session, questions]);
  return {
    ...(state.uid === (uid || null)
      ? state
      : { status: 'local', reason: 'guest', error: null, summary: null }),
    retry: () => store.capture(session, questions, { retry: true }),
  };
}
