import { useEffect, useMemo, useSyncExternalStore } from 'react';
import customQuizService from '../services/customQuizService';
import { createCustomQuizStore } from '../services/customQuizStore.js';
import { clearCustomQuizDrafts } from '../utils/customQuizDrafts.js';

export function useCustomQuizzes(uid, enabled) {
  const store = useMemo(
    () =>
      createCustomQuizStore(customQuizService, {
        onInvalidate: (owner, quiz) => {
          try {
            clearCustomQuizDrafts(sessionStorage, owner, quiz);
          } catch {
            /* Versioned identities remain safe when browser storage is unavailable. */
          }
        },
      }),
    []
  );
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    store.activate(uid, enabled);
    return () => store.activate(null, false);
  }, [store, uid, enabled]);
  useEffect(() => {
    if (!enabled || !uid) return;
    const refresh = () => {
      if (!store.getSnapshot().pending) store.reload();
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [store, uid, enabled]);
  const current = snapshot.uid === (uid || null);
  return {
    ...store,
    quizzes: current ? snapshot.quizzes : [],
    loading: !!uid && enabled && (!current || snapshot.loading),
    error: current ? snapshot.error : null,
    pending: current ? snapshot.pending : null,
  };
}

export function customQuizProgress(quiz, cloud) {
  return {
    progress: quiz?.checkpoint ? { [quiz.id]: quiz.checkpoint } : {},
    loading: cloud.loading,
    error: cloud.error,
    pendingQuiz: cloud.pending && quiz ? quiz.id : null,
    reload: cloud.reload,
    save: (_, index, questionId) => cloud.checkpoint(quiz, index, questionId),
  };
}
