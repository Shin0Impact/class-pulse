import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Language = 'ar' | 'en';
type Theme = 'light' | 'dark';

type PreferencesValue = {
  language: Language;
  theme: Theme;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('class-pulse-language') === 'en' ? 'en' : 'ar'));
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('class-pulse-theme') === 'dark' ? 'dark' : 'light'));

  useEffect(() => {
    localStorage.setItem('class-pulse-language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    localStorage.setItem('class-pulse-theme', theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo(() => ({
    language,
    theme,
    setLanguage,
    toggleLanguage: () => setLanguage((current) => (current === 'ar' ? 'en' : 'ar')),
    toggleTheme: () => setTheme((current) => (current === 'light' ? 'dark' : 'light')),
  }), [language, theme]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}
