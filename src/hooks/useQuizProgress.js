import { useEffect, useMemo, useSyncExternalStore } from 'react';
import userService from '../services/userService';
import { createQuizProgressStore } from '../services/quizProgressStore.js';

export function useQuizProgress(uid) {
  const store = useMemo(() => createQuizProgressStore(userService), []);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    store.setUser(uid);
    return () => {
      store.setUser(null);
    };
  }, [store, uid]);
  const current = snapshot.uid === (uid || null);
  return {
    progress: current ? snapshot.progress : {},
    loading: !!uid && (!current || snapshot.loading),
    error: current ? snapshot.error : null,
    pendingQuiz: current ? snapshot.pendingQuiz : null,
    reload: store.reload,
    save: store.save,
    remove: store.remove,
  };
}
