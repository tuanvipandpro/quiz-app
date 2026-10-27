import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translate } from '../i18n/messages';

const LanguageContext = createContext(null);
const LANGUAGE_KEY = 'quiz-app-language';

function initialLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === 'vi' || saved === 'en') return saved;
  } catch {
    /* Preferences are optional when browser storage is disabled. */
  }
  return navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(initialLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      /* Keep the in-memory preference. */
    }
  }, [language]);
  const value = useMemo(
    () => ({ language, setLanguage, t: (key, params) => translate(language, key, params) }),
    [language]
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
