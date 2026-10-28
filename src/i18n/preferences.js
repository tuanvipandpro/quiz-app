export const LANGUAGE_KEY = 'quiz-app-language';

export function readPreferredLanguage(storage) {
  try {
    const saved = storage?.getItem(LANGUAGE_KEY);
    if (saved === 'vi' || saved === 'en') return saved;
  } catch {
    /* Language selection still works when browser storage is unavailable. */
  }
  return 'en';
}
