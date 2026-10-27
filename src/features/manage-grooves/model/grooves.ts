import {
  BAR_TICKS,
  eventId,
  type Pattern,
  type Instrument,
  type DrumEvent,
} from '../../../entities/drum-pattern';
import { GROOVE_CATALOG } from './catalog-data';
export { GROOVE_CATALOG } from './catalog-data';
export function grooveCandidate(pattern: Pattern, firstBar: number, lastBar: number, id: string) {
  const card = GROOVE_CATALOG.find((c) => c.id === id);
  if (
    !card ||
    !Number.isInteger(firstBar) ||
    !Number.isInteger(lastBar) ||
    firstBar < 0 ||
    lastBar < firstBar ||
    lastBar >= pattern.barCount
  )
    throw new Error('Выберите корректные такты и ритм');
  const events: DrumEvent[] = [];
  for (let bar = firstBar; bar <= lastBar; bar++)
    for (const e of card.events) {
      const tick = bar * BAR_TICKS + e.tick;
      events.push({ ...e, tick, id: eventId(e.instrument, tick) });
    }
  return {
    fill: {
      id: card.id,
      name: card.name,
      style: card.style,
      density: card.density,
      events,
      seed: 0,
      version: 1 as const,
    },
    range: {
      start: firstBar * BAR_TICKS,
      end: (lastBar + 1) * BAR_TICKS,
      tracks: [...new Set(card.events.map((e) => e.instrument))] as Instrument[],
    },
  };
}
