import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

export type Language = 'en' | 'ru';

interface LocalizationContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: { [key: string]: string | number }) => any;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const getInitialLanguage = (): Language => {
    const storedLang = localStorage.getItem('language');
    if (storedLang === 'en' || storedLang === 'ru') {
        return storedLang;
    }
    const browserLang = navigator.language.split(/[-_]/)[0];
    return browserLang === 'ru' ? 'ru' : 'en';
};


export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage());
  const [translations, setTranslations] = useState<{ [key: string]: any } | null>(null);

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const [enResponse, ruResponse] = await Promise.all([
          fetch('./locales/en.json'),
          fetch('./locales/ru.json')
        ]);
        if (!enResponse.ok || !ruResponse.ok) {
          throw new Error(`HTTP error! status: ${enResponse.status} & ${ruResponse.status}`);
        }
        const en = await enResponse.json();
        const ru = await ruResponse.json();
        setTranslations({ en, ru });
      } catch (error) {
        console.error("Failed to load translation files:", error);
        // Fallback to empty objects to prevent the app from crashing.
        setTranslations({ en: {}, ru: {} });
      }
    };
    loadTranslations();
  }, []);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
      setLanguageState(lang);
  };

  const t = useCallback((key: string, params?: { [key: string]: string | number }): any => {
    if (!translations) {
      // Handle loading state: return safe fallbacks for array-based keys to prevent crashes.
      if (key === 'months_full' || key === 'days_short') {
        return [];
      }
      return key;
    }

    // Attempt to find the translation in the current language, then fallback to English.
    let translation = translations[language]?.[key] || translations['en']?.[key];

    // If still not found, we have an issue.
    if (translation === undefined) {
      // For specific keys known to be arrays, return an empty array to prevent crashes.
      if (key === 'months_full' || key === 'days_short') {
        return [];
      }
      // For string keys, fallback to the key itself.
      return key;
    }

    if (params && typeof translation === 'string') {
      Object.keys(params).forEach(paramKey => {
        translation = (translation as string).replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }
    
    return translation;
  }, [language, translations]);

  if (!translations) {
    // Render nothing until translations are loaded to prevent untranslated text from flashing.
    return null;
  }

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};