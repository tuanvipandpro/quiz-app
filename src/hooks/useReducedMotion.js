import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';
const subscribe = (onChange) => {
  const preference = window.matchMedia?.(QUERY);
  preference?.addEventListener('change', onChange);
  return () => preference?.removeEventListener('change', onChange);
};
const getSnapshot = () => window.matchMedia?.(QUERY).matches ?? false;

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
