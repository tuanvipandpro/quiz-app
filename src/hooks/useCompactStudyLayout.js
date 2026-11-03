import { useSyncExternalStore } from 'react';

// Matches the existing single-column study breakpoint in App.css.
const query = '(max-width: 900px)';
const subscribe = (notify) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
const snapshot = () => window.matchMedia(query).matches;

export function useCompactStudyLayout() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
