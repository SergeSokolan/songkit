import type { Language } from '../../../shared/i18n';
import type { FILL_CATALOG } from '../model/catalog';
import type { FILL_LIBRARY } from '../model/fills';

export const fillCopy = {
  ru: {
    catalog: 'Каталог брейков',
    openCatalog: 'Брейки · библиотека и предложения',
    title: (bar: number) => `Брейк · такт ${bar}`,
    intro: (beats: number) =>
      `Последние ${beats} ${beats === 1 ? 'доля' : 'доли'} выбранного такта. Каждая карточка — законченная фраза в 4/4.`,
    genre: 'Жанр брейка',
    length: 'Длительность брейка',
    barUnit: 'такт',
    allowMissing: 'Добавить недостающие дорожки при применении',
    missingTracks: 'Нужны дорожки:',
    listen: 'Послушать',
    stop: 'Остановить',
    apply: 'Применить брейк',
    notation:
      'Учебные адаптации SongKit, CC0. S — малый, H — хэт, K — бочка, R/L — руки; скобки — тихий удар.',
    advanced: 'Брейки',
    openAdvanced: 'Дополнительно: генератор и произвольный участок',
    advancedTitle: 'Брейк внутри фразы',
    advancedIntro:
      'Заменяются только выбранные дорожки внутри участка. Остальная партия сохраняется.',
    range: (start: string, end: string, beats: number) =>
      `Участок: ${start} → ${end}. Длина: ${beats} доли. Для всех мелких ударов выберите сетку 1/32.`,
    boundary: (bar: number, beat: number, sub: number) =>
      `Такт ${bar}, доля ${beat}${sub ? ` + ${sub}/8 доли` : ''}`,
    endOfPhrase: 'конец фразы',
    endOption: 'Конец фразы',
    start: 'От доли',
    startLabel: 'Начало брейка',
    end: 'До границы',
    endLabel: 'Конец брейка',
    style: 'Стиль',
    tracks: 'Дорожки замены',
    add: ' (добавить)',
    allowSelected: 'Разрешаю добавить недостающие выбранные инструменты при применении',
    invalidRange: 'Выберите конец после начала и хотя бы одну дорожку.',
    generated: 'Под мой бит',
    regenerate: 'Другие варианты',
    fewerVariants: 'Для этого участка и дорожек доступно меньше трёх различных вариантов.',
    library: 'Библиотека',
    attribution:
      'Оригинальные шаблоны SongKit, CC0. Длительность подстраивается к участку без изменения размера.',
  },
  en: {
    catalog: 'Fill catalog',
    openCatalog: 'Fills · library and suggestions',
    title: (bar: number) => `Fill · bar ${bar}`,
    intro: (beats: number) =>
      `The last ${beats} ${beats === 1 ? 'beat' : 'beats'} of the selected bar. Each card is a complete phrase in 4/4.`,
    genre: 'Fill genre',
    length: 'Fill length',
    barUnit: 'bar',
    allowMissing: 'Add missing tracks when applying',
    missingTracks: 'Required tracks:',
    listen: 'Listen',
    stop: 'Stop',
    apply: 'Apply fill',
    notation:
      'SongKit practice adaptations, CC0. S = snare, H = hi-hat, K = kick, R/L = right/left hand. Parentheses mark ghost notes.',
    advanced: 'Fills',
    openAdvanced: 'Advanced fills · generator and custom range',
    advancedTitle: 'Fill within the phrase',
    advancedIntro: 'The fill replaces the selected tracks within the chosen range.',
    range: (start: string, end: string, beats: number) =>
      `${start} → ${end} · ${beats} ${beats === 1 ? 'beat' : 'beats'}. Use the 1/32 grid to see every subdivision.`,
    boundary: (bar: number, beat: number, sub: number) =>
      `Bar ${bar}, beat ${beat}${sub ? ` + ${sub}/8 of a beat` : ''}`,
    endOfPhrase: 'end of phrase',
    endOption: 'End of phrase',
    start: 'From',
    startLabel: 'Fill start',
    end: 'To',
    endLabel: 'Fill end',
    style: 'Style',
    tracks: 'Tracks to replace',
    add: ' (add)',
    allowSelected: 'Add missing selected instruments when applying',
    invalidRange: 'Choose an end after the start and select at least one track.',
    generated: 'Suggestions for my beat',
    regenerate: 'More variations',
    fewerVariants: 'This range and track selection yield fewer than three distinct variations.',
    library: 'Library',
    attribution: 'Original SongKit templates, CC0. Each fill fits the selected range in 4/4.',
  },
};

type FillTitle =
  | (typeof FILL_CATALOG)[number]['name']
  | (typeof FILL_LIBRARY)[number]['name']
  | 'Свободнее'
  | 'Движение'
  | 'Разгон';

const englishTitles = new Map<string, string>(
  Object.entries({
    'Малый восьмыми': 'Eighth-note snare',
    'Спуск: малый и томы': 'Snare and tom descent',
    'Короткий ответ малого': 'Short snare pickup',
    'Ответ малого и тома': 'Snare and tom response',
    '2 руками + 2 бочкой': '2 hand strokes + 2 kicks',
    '4 руками + 2 бочкой': '4 hand strokes + 2 kicks',
    '2 руками + 1 бочкой': '2 hand strokes + 1 kick',
    'Линейный ответ': 'Linear response',
    'Ответ с тихим малым': 'Response with snare ghost notes',
    'Малый триолями': 'Snare triplets',
    'Триольный спуск': 'Triplet descent',
    'Спуск по томам': 'Tom descent',
    'Воздушный переход': 'Spacious transition',
    Нарастание: 'Build-up',
    'Тихие шестнадцатые': 'Sixteenth-note ghost notes',
    'Ломаный спуск': 'Syncopated descent',
    Свободнее: 'More space',
    Движение: 'Movement',
    Разгон: 'Build momentum',
  } satisfies Record<FillTitle, string>),
);
const englishDensities = new Map([
  ['Простой', 'Simple'],
  ['Редкий', 'Sparse'],
  ['Средний', 'Medium'],
  ['Плотный', 'Dense'],
]);

export function fillLabels(
  language: Language,
  { name, density }: { name: string; density: string },
) {
  return language === 'ru'
    ? { name, density }
    : { name: englishTitles.get(name) ?? name, density: englishDensities.get(density) ?? density };
}
