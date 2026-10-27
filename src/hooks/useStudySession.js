import { useEffect, useState } from 'react';
import { initialStudySession } from '../utils/studySession';

export function useStudySession(key, questions, mode, create, options = {}) {
  const [session, setSession] = useState(() => {
    let storage = null;
    try {
      storage = sessionStorage;
    } catch {
      /* Local drafts are optional. */
    }
    return initialStudySession(storage, key, questions, mode, create, options);
  });
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(session));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [key, session]);
  return [session, setSession, saved];
}
