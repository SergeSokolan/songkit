import type { Language } from '../../../shared/i18n';
import type { GROOVE_CATALOG } from '../model/catalog-data';

export const grooveCopy = {
  ru: {
    catalog: 'Базовые ритмы',
    title: 'Основа партии',
    genre: 'Жанр ритма',
    repeat: 'Повторить во всех тактах',
    range: (bar: number, all: boolean) =>
      `Заменяются дорожки карточки: ${all ? 'все такты' : `такт ${bar}`}. Темп сохраняется.`,
    allowMissing: 'Добавить недостающие инструменты',
    tracks: 'Дорожки:',
    missingTracks: 'Добавьте:',
    listen: 'Послушать',
    stop: 'Остановить',
    apply: 'Применить ритм',
    attribution:
      'Оригинальные учебные адаптации. Обратный свинг — согласованный вариант короткая/длинная, не общепринятый стандарт джаза. Райд и остальные инструменты имеют отдельные позиции; вся партия автоматически не свингуется.',
  },
  en: {
    catalog: 'Basic grooves',
    title: 'Groove foundation',
    genre: 'Groove genre',
    repeat: 'Repeat in all bars',
    range: (bar: number, all: boolean) =>
      `Replaces the tracks on the card in ${all ? 'all bars' : `bar ${bar}`} at the current tempo.`,
    allowMissing: 'Add missing instruments',
    tracks: 'Tracks:',
    missingTracks: 'Required tracks:',
    listen: 'Listen',
    stop: 'Stop',
    apply: 'Apply groove',
    attribution:
      'Original practice adaptations. Reverse swing is a short–long practice variation. The ride and the other instruments each follow their own written rhythm.',
  },
};

type GrooveCard = (typeof GROOVE_CATALOG)[number];
const englishCards: Record<GrooveCard['id'], { name: string; description: string }> = {
  'rock-basic': {
    name: 'Basic rock',
    description: 'Eighth notes on the hi-hat, kick on 1 and 3, and snare on 2 and 4.',
  },
  'rock-push': {
    name: 'Rock with a kick pickup',
    description: 'The kick lands on the eighth-note offbeat before beat 4.',
  },
  'rock-half': {
    name: 'Half-time rock',
    description: 'The snare lands once per bar, on beat 3.',
  },
  'metal-heavy': {
    name: 'Heavy backbeat',
    description: 'Paired kicks with snare on beats 2 and 4.',
  },
  'metal-double': {
    name: 'Steady double kick',
    description: 'Sixteen kick hits per bar on a single kick track.',
  },
  'metal-bursts': {
    name: 'Double-kick bursts',
    description: 'Four kicks followed by a rest, with another burst on beat 3.',
  },
  'pop-basic': {
    name: 'Pop backbeat',
    description: 'Light hi-hat with a backbeat on 2 and 4.',
  },
  'pop-four': {
    name: 'Four-on-the-floor',
    description: 'A kick on every beat.',
  },
  'pop-half': {
    name: 'Sparse pop',
    description: 'Quarter notes on the hi-hat and snare on beat 3.',
  },
  'funk-sync': {
    name: 'Syncopated kick',
    description: 'Offbeat sixteenth-note kicks between snare backbeats.',
  },
  'funk-ghost': {
    name: 'Funk with ghost notes',
    description: 'Snare ghost notes between the backbeats on 2 and 4.',
  },
  'funk-linear': {
    name: 'Linear groove',
    description: 'The instruments take turns, one hit at a time.',
  },
  'jazz-swing': {
    name: 'Ride swing',
    description: 'Quarter notes with a late response after beats 2 and 4.',
  },
  'jazz-comp': {
    name: 'Swing with snare comping',
    description: 'The ride holds the pattern while the snare answers between beats.',
  },
  'jazz-reverse': {
    name: 'Reverse ride swing',
    description: 'The response after beats 2 and 4 comes one third of a beat later.',
  },
};
const englishFeel: Record<GrooveCard['feel'], string> = {
  'Ровные четверти': 'Straight quarter notes',
  'Ровные восьмые': 'Straight eighth notes',
  'Ровные шестнадцатые': 'Straight sixteenth notes',
  'Длинная / короткая · 2:1': 'Long / short · 2:1',
  'Короткая / длинная · 1:2': 'Short / long · 1:2',
};
const englishDensity: Record<GrooveCard['density'], string> = {
  Простой: 'Simple',
  Средний: 'Medium',
};

export function grooveLabels(language: Language, card: GrooveCard) {
  return language === 'ru'
    ? card
    : {
        ...englishCards[card.id],
        feel: englishFeel[card.feel],
        density: englishDensity[card.density],
      };
}
