import { parseRoute } from './navigation.js';

export const THEME_KEY = 'quiz-app-theme';

export function readDarkMode(storage, hash, systemDark = false) {
  try {
    const saved = storage?.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved === 'dark';
  } catch {
    // Preferences are optional when browser storage is unavailable.
  }
  return ['home', 'donate'].includes(parseRoute(hash).page) || systemDark;
}
