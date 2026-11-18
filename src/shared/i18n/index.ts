import { createContext, useContext } from 'react';

export type Language = 'ru' | 'en';
export const LanguageContext = createContext<Language>('ru');
export const useLanguage = () => useContext(LanguageContext);

export const genreLabels = {
  ru: { rock: 'Рок', metal: 'Металл', pop: 'Поп', funk: 'Фанк', jazz: 'Джаз' },
  en: { rock: 'Rock', metal: 'Metal', pop: 'Pop', funk: 'Funk', jazz: 'Jazz' },
} as const;

const englishInstruments: Record<string, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hat: 'Hi-hat',
  tom1: 'High tom',
  tom2: 'Mid tom',
  tom3: 'Floor tom',
  ride: 'Ride',
  crash1: 'Crash 1',
  crash2: 'Crash 2',
};

export function instrumentName(language: Language, id: string, fallback = id) {
  return language === 'en' && Object.hasOwn(englishInstruments, id)
    ? englishInstruments[id]
    : fallback;
}
