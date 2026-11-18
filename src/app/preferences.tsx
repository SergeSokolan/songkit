import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { LanguageContext, useLanguage, type Language } from '../shared/i18n';

const themes = ['olive', 'dusk', 'linen'] as const;
type Theme = (typeof themes)[number];

function isTheme(value: string | undefined): value is Theme {
  return themes.some((theme) => theme === value);
}

const PreferencesContext = createContext<{
  theme: Theme;
  setTheme: (value: Theme) => void;
  setLanguage: (value: Language) => void;
}>({
  theme: 'olive',
  setTheme: () => {},
  setLanguage: () => {},
});

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Keep the new preference in memory when storage is blocked.
  }
}

export function Preferences({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    document.documentElement.lang === 'en' ? 'en' : 'ru',
  );
  const [theme, setTheme] = useState<Theme>(() => {
    const value = document.documentElement.dataset.theme;
    return isTheme(value) ? value : 'olive';
  });

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        'content',
        getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim() ||
          '#171918',
      );
  }, [theme]);

  useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.title =
      language === 'en' ? 'SongKit · Drum workshop' : 'SongKit · Барабанная мастерская';
  }, [language]);

  return (
    <LanguageContext.Provider value={language}>
      <PreferencesContext.Provider value={{ theme, setTheme, setLanguage }}>
        {children}
      </PreferencesContext.Provider>
    </LanguageContext.Provider>
  );
}

export function PreferencesControls() {
  const language = useLanguage();
  const { theme, setTheme, setLanguage } = useContext(PreferencesContext);
  const themeLabel = language === 'ru' ? 'Тема' : 'Theme';
  const languageLabel = language === 'ru' ? 'Язык' : 'Language';
  return (
    <div className="header-preferences">
      <label>
        <span>{themeLabel}</span>
        <select
          aria-label={themeLabel}
          value={theme}
          onChange={({ currentTarget }) => {
            const value = currentTarget.value;
            if (!isTheme(value)) return;
            setTheme(value);
            persist('songkit.theme', value);
          }}
        >
          <option value="olive">{language === 'ru' ? 'Оливковая' : 'Olive'}</option>
          <option value="dusk">{language === 'ru' ? 'Сумерки' : 'Dusk'}</option>
          <option value="linen">{language === 'ru' ? 'Лён' : 'Linen'}</option>
        </select>
      </label>
      <label>
        <span>{languageLabel}</span>
        <select
          aria-label={languageLabel}
          value={language}
          onChange={({ currentTarget }) => {
            const value = currentTarget.value;
            if (value !== 'ru' && value !== 'en') return;
            setLanguage(value);
            persist('songkit.language', value);
          }}
        >
          <option value="ru" lang="ru">
            Русский
          </option>
          <option value="en" lang="en">
            English
          </option>
        </select>
      </label>
    </div>
  );
}
