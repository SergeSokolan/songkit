import { BAR_TICKS, eventId, type Pattern, type Instrument } from '../../../entities/drum-pattern';
import { FILL_CATALOG } from './catalog-data';
import { validateRange, type Fill, type FillRange } from './fills';
export { FILL_CATALOG } from './catalog-data';
export const GENRES = {
  rock: 'Рок',
  metal: 'Металл',
  pop: 'Поп',
  funk: 'Фанк',
  jazz: 'Джаз',
} as const;
export function catalogFill(
  pattern: Pattern,
  bar: number,
  id: string,
): { fill: Fill; range: FillRange } {
  const card = FILL_CATALOG.find((item) => item.id === id);
  if (!card || !Number.isInteger(bar) || bar < 0 || bar >= pattern.barCount)
    throw new Error('Неизвестный брейк или такт');
  const end = (bar + 1) * BAR_TICKS,
    start = end - card.beats * 960;
  const tracks = [...new Set(card.events.map((e) => e.instrument))] as Instrument[];
  const range = { start, end, tracks };
  validateRange(pattern, range);
  return {
    range,
    fill: {
      id: card.id,
      name: card.name,
      style: card.style,
      density: card.density,
      seed: 0,
      version: 1,
      events: card.events.map((e) => ({
        ...e,
        tick: e.tick + start,
        id: eventId(e.instrument, e.tick + start),
      })),
    },
  };
}
