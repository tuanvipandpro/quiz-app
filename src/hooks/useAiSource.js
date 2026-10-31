import { useSyncExternalStore } from 'react';
import appAiService from '../services/appAiService';

const listeners = new Set();
const preferences = new Map();
const notify = () => listeners.forEach((listener) => listener());
function read(uid) {
  if (!uid) return 'byok';
  if (!preferences.has(uid)) {
    let saved;
    try {
      saved = localStorage.getItem(`quiz-ai-source:${uid}`);
    } catch {
      /* Optional preference. */
    }
    preferences.set(uid, saved === 'byok' ? 'byok' : appAiService.configured ? 'app' : 'byok');
  }
  return preferences.get(uid);
}
export function useAiSource(uid) {
  const source = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => read(uid)
  );
  const setSource = (next) => {
    if (!uid || !['app', 'byok'].includes(next) || (next === 'app' && !appAiService.configured))
      return;
    preferences.set(uid, next);
    try {
      localStorage.setItem(`quiz-ai-source:${uid}`, next);
    } catch {
      /* In-memory choice remains. */
    }
    notify();
  };
  return { source, setSource, appAvailable: !!uid && appAiService.configured };
}
