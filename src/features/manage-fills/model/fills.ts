import {
  INSTRUMENTS,
  PPQ,
  totalTicks,
  parsePattern,
  eventId,
  type Pattern,
  type Instrument,
  type DrumEvent,
} from '../../../entities/drum-pattern';
export interface FillRange {
  start: number;
  end: number;
  tracks: Instrument[];
}
export interface Fill {
  id: string;
  name: string;
  style: string;
  density: string;
  events: DrumEvent[];
  seed: number;
  version: 1;
}
export const FILL_LIBRARY = [
  {
    id: 'rock-snare',
    name: 'Малый восьмыми',
    style: 'rock',
    density: 'Простой',
    step: 480,
    kit: ['snare'],
  },
  {
    id: 'rock-toms',
    name: 'Спуск по томам',
    style: 'rock',
    density: 'Средний',
    step: 240,
    kit: ['snare', 'tom1', 'tom2', 'tom3'],
  },
  {
    id: 'pop-space',
    name: 'Воздушный переход',
    style: 'pop',
    density: 'Простой',
    step: 960,
    kit: ['snare', 'hat'],
  },
  {
    id: 'pop-build',
    name: 'Нарастание',
    style: 'pop',
    density: 'Средний',
    step: 240,
    kit: ['snare'],
  },
  {
    id: 'funk-ghost',
    name: 'Тихие шестнадцатые',
    style: 'funk',
    density: 'Средний',
    step: 240,
    kit: ['snare', 'hat'],
  },
  {
    id: 'funk-toms',
    name: 'Ломаный спуск',
    style: 'funk',
    density: 'Плотный',
    step: 120,
    kit: ['snare', 'tom1', 'tom2'],
  },
] as const;
export function validateRange(pattern: Pattern, range: FillRange) {
  if (
    !Number.isInteger(range.start) ||
    !Number.isInteger(range.end) ||
    range.start < 0 ||
    range.end > totalTicks(pattern) ||
    range.start >= range.end ||
    range.start % 120 ||
    range.end % 120 ||
    !range.tracks.length ||
    new Set(range.tracks).size !== range.tracks.length ||
    range.tracks.some((t) => !INSTRUMENTS.includes(t))
  )
    throw new Error('Выберите корректный участок и дорожки');
}
export function applyFill(
  pattern: Pattern,
  range: FillRange,
  fill: Fill,
  allowMissing = false,
): Pattern {
  validateRange(pattern, range);
  if (
    fill.events.some(
      (e) => e.tick < range.start || e.tick >= range.end || !range.tracks.includes(e.instrument),
    )
  )
    throw new Error('Брейк выходит за выбранную область');
  const missing = fill.events
    .map((e) => e.instrument)
    .filter((t) => !pattern.instruments.includes(t));
  if (missing.length && !allowMissing) throw new Error('Подтвердите добавление инструментов');
  return parsePattern({
    ...pattern,
    instruments: INSTRUMENTS.filter((t) => pattern.instruments.includes(t) || missing.includes(t)),
    events: [
      ...pattern.events.filter(
        (e) => e.tick < range.start || e.tick >= range.end || !range.tracks.includes(e.instrument),
      ),
      ...fill.events,
    ],
  });
}
function playable(pattern: Pattern, range: FillRange, events: DrumEvent[]): DrumEvent[] {
  const kept = pattern.events.filter(
    (e) =>
      e.instrument !== 'kick' &&
      (e.tick < range.start || e.tick >= range.end || !range.tracks.includes(e.instrument)),
  );
  return events.filter(
    (e) =>
      e.instrument === 'kick' ||
      kept.filter((k) => k.tick === e.tick).length +
        events.filter((k) => k.tick === e.tick && k.instrument !== 'kick').indexOf(e) <
        2,
  );
}
export function libraryFill(pattern: Pattern, range: FillRange, id: string): Fill {
  validateRange(pattern, range);
  const template = FILL_LIBRARY.find((t) => t.id === id);
  if (!template) throw new Error('Неизвестный брейк');
  const kit = template.kit.filter((t) => range.tracks.includes(t));
  const events: DrumEvent[] = [];
  if (kit.length)
    for (let tick = range.start, i = 0; tick < range.end; tick += template.step, i++) {
      if (template.id === 'funk-toms' && i % 4 === 1) continue;
      const instrument =
        kit[
          Math.min(
            kit.length - 1,
            Math.floor(((tick - range.start) / (range.end - range.start)) * kit.length),
          )
        ];
      events.push({
        id: eventId(instrument, tick),
        instrument,
        tick,
        velocity:
          template.id === 'pop-build'
            ? (tick - range.start) / (range.end - range.start) < 0.33
              ? 35
              : (tick - range.start) / (range.end - range.start) < 0.66
                ? 80
                : 115
            : template.id === 'funk-ghost' && i % 2
              ? 35
              : tick % PPQ === 0
                ? 115
                : 80,
      });
    }
  return {
    id,
    name: template.name,
    style: template.style,
    density: template.density,
    events: playable(pattern, range, events),
    seed: 0,
    version: 1,
  };
}
export function suggestFills(pattern: Pattern, range: FillRange, seed = 1, style = 'rock'): Fill[] {
  validateRange(pattern, range);
  const kit = INSTRUMENTS.filter(
    (t) => range.tracks.includes(t) && pattern.instruments.includes(t) && t !== 'kick',
  );
  if (!kit.length) return [];
  const previous = pattern.events.filter((e) => {
    const distance = (range.start - e.tick + totalTicks(pattern)) % totalTicks(pattern);
    return distance > 0 && distance <= 4 * PPQ;
  });
  const density = previous.length > 12 ? 240 : 480;
  const signature = previous.reduce((n, e) => n + e.tick / 120 + e.velocity, seed);
  const results: Fill[] = [];
  for (let variant = 0; variant < 3; variant++) {
    const step = variant === 2 ? 120 : variant === 1 ? 240 : 480;
    const events: DrumEvent[] = [];
    for (let tick = range.start, i = 0; tick < range.end; tick += step, i++) {
      if (style === 'pop' && variant === 2 && i % 4 === 1) continue;
      const instrument = kit[(Math.floor(signature) + i + variant) % kit.length];
      const velocity =
        tick % PPQ === 0
          ? 115
          : (style === 'funk' || variant === 2 || density === 240) && (i + seed) % 2
            ? 35
            : 80;
      events.push({ id: eventId(instrument, tick), instrument, tick, velocity });
    }
    const fill: Fill = {
      id: `generated-v1-${seed}-${variant}`,
      name: ['Свободнее', 'Движение', 'Разгон'][variant],
      style,
      density: ['Редкий', 'Средний', 'Плотный'][variant],
      events: playable(pattern, range, events),
      seed,
      version: 1,
    };
    if (
      fill.events.length &&
      !results.some((r) => JSON.stringify(r.events) === JSON.stringify(fill.events))
    )
      results.push(fill);
  }
  return results;
}
