import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translate } from '../i18n/messages';
import { LANGUAGE_KEY, readPreferredLanguage } from '../i18n/preferences';

const LanguageContext = createContext(null);

function initialLanguage() {
  try {
    return readPreferredLanguage(localStorage);
  } catch {
    /* Preferences are optional when browser storage is disabled. */
  }
  return 'en';
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
