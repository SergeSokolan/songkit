export const PPQ = 960;
export const BAR_TICKS = PPQ * 4;
export const INSTRUMENTS = ['kick', 'snare', 'hat'] as const;
export type Instrument = (typeof INSTRUMENTS)[number];
export const VELOCITIES = { ghost: 35, normal: 80, accent: 115 } as const;
export type Strength = keyof typeof VELOCITIES;
export type Grid = 4 | 8 | 16 | 32;
export interface DrumEvent {
  id: string;
  instrument: Instrument;
  tick: number;
  velocity: number;
}
export interface Pattern {
  schemaVersion: 1;
  tempo: number;
  timeSignature: readonly [4, 4];
  barCount: number;
  events: DrumEvent[];
}
export interface EditorView {
  bar: number;
  grid: Grid;
  position: number;
  scrollLeft: number;
}
export interface Draft {
  schemaVersion: 1;
  pattern: Pattern;
  view: EditorView;
}
export const defaultView: EditorView = { bar: 0, grid: 8, position: 0, scrollLeft: 0 };
export function createPattern(): Pattern {
  return { schemaVersion: 1, tempo: 100, timeSignature: [4, 4], barCount: 1, events: [] };
}
export function eventId(instrument: Instrument, tick: number): string {
  return `${instrument}:${tick}`;
}
export function totalTicks(pattern: Pattern): number {
  return BAR_TICKS * pattern.barCount;
}
export function gridTicks(grid: Grid): number {
  return (PPQ * 4) / grid;
}
export function strengthOf(velocity: number): Strength {
  return velocity < 58 ? 'ghost' : velocity < 98 ? 'normal' : 'accent';
}
export function setHit(
  pattern: Pattern,
  instrument: Instrument,
  tick: number,
  velocity: number | null,
): Pattern {
  if (
    !INSTRUMENTS.includes(instrument) ||
    !Number.isInteger(tick) ||
    tick < 0 ||
    tick >= totalTicks(pattern) ||
    tick % 120 !== 0
  )
    throw new Error('Недопустимая позиция удара');
  if (velocity !== null && (!Number.isInteger(velocity) || velocity < 1 || velocity > 127))
    throw new Error('Недопустимая сила удара');
  const events = pattern.events.filter((e) => !(e.instrument === instrument && e.tick === tick));
  if (velocity !== null) events.push({ id: eventId(instrument, tick), instrument, tick, velocity });
  return {
    ...pattern,
    events: events.sort((a, b) => a.tick - b.tick || a.instrument.localeCompare(b.instrument)),
  };
}
export function moveHit(
  pattern: Pattern,
  instrument: Instrument,
  from: number,
  to: number,
): Pattern {
  const event = pattern.events.find((e) => e.instrument === instrument && e.tick === from);
  if (!event || from === to) return pattern;
  return setHit(setHit(pattern, instrument, from, null), instrument, to, event.velocity);
}
export function resizePattern(pattern: Pattern, barCount: number): Pattern {
  if (!Number.isInteger(barCount) || barCount < 1 || barCount > 4)
    throw new Error('Допустимо от 1 до 4 тактов');
  return {
    ...pattern,
    barCount,
    events: pattern.events.filter((e) => e.tick < barCount * BAR_TICKS),
  };
}
export function setTempo(pattern: Pattern, tempo: number): Pattern {
  if (!Number.isInteger(tempo) || tempo < 40 || tempo > 240) throw new Error('Темп от 40 до 240');
  return { ...pattern, tempo };
}
export function demoPattern(): Pattern {
  let pattern = createPattern();
  for (let i = 0; i < 8; i++) pattern = setHit(pattern, 'hat', i * 480, i % 2 === 0 ? 80 : 55);
  for (const tick of [0, 1920, 2640]) pattern = setHit(pattern, 'kick', tick, 80);
  for (const tick of [960, 2880]) pattern = setHit(pattern, 'snare', tick, 80);
  return pattern;
}
export function parsePattern(value: unknown): Pattern {
  if (!value || typeof value !== 'object') throw new Error('Неверный файл проекта');
  const p = value as Record<string, unknown>;
  if (
    p.schemaVersion !== 1 ||
    !Array.isArray(p.timeSignature) ||
    p.timeSignature.length !== 2 ||
    p.timeSignature[0] !== 4 ||
    p.timeSignature[1] !== 4 ||
    !Number.isInteger(p.tempo) ||
    Number(p.tempo) < 40 ||
    Number(p.tempo) > 240 ||
    !Number.isInteger(p.barCount) ||
    Number(p.barCount) < 1 ||
    Number(p.barCount) > 4 ||
    !Array.isArray(p.events) ||
    p.events.length > 384
  )
    throw new Error('Неподдерживаемый формат проекта');
  const seen = new Set<string>();
  const events: DrumEvent[] = p.events.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Неверный удар');
    const e = item as Record<string, unknown>;
    if (
      !INSTRUMENTS.includes(e.instrument as Instrument) ||
      !Number.isInteger(e.tick) ||
      Number(e.tick) < 0 ||
      Number(e.tick) >= Number(p.barCount) * BAR_TICKS ||
      Number(e.tick) % 120 !== 0 ||
      !Number.isInteger(e.velocity) ||
      Number(e.velocity) < 1 ||
      Number(e.velocity) > 127
    )
      throw new Error('Неверные параметры удара');
    const instrument = e.instrument as Instrument;
    const tick = Number(e.tick);
    const id = eventId(instrument, tick);
    if (seen.has(id)) throw new Error('Повторяющиеся удары');
    seen.add(id);
    return { id, instrument, tick, velocity: Number(e.velocity) };
  });
  return {
    schemaVersion: 1,
    tempo: Number(p.tempo),
    timeSignature: [4, 4],
    barCount: Number(p.barCount),
    events: events.sort((a, b) => a.tick - b.tick),
  };
}
export function parseDraft(value: unknown): Draft {
  if (!value || typeof value !== 'object') throw new Error('Неверный черновик');
  const d = value as Record<string, unknown>;
  if (d.schemaVersion !== 1 || !d.view || typeof d.view !== 'object')
    throw new Error('Неизвестная версия черновика');
  const pattern = parsePattern(d.pattern);
  const v = d.view as Record<string, unknown>;
  if (
    !Number.isInteger(v.bar) ||
    Number(v.bar) < 0 ||
    Number(v.bar) >= pattern.barCount ||
    !Number.isInteger(v.grid) ||
    ![4, 8, 16, 32].includes(Number(v.grid)) ||
    !Number.isInteger(v.position) ||
    Number(v.position) < 0 ||
    Number(v.position) >= totalTicks(pattern) ||
    typeof v.scrollLeft !== 'number' ||
    !Number.isFinite(v.scrollLeft) ||
    v.scrollLeft < 0
  )
    throw new Error('Неверное состояние редактора');
  return {
    schemaVersion: 1,
    pattern,
    view: {
      bar: Number(v.bar),
      grid: Number(v.grid) as Grid,
      position: Number(v.position),
      scrollLeft: v.scrollLeft,
    },
  };
}
export interface History {
  past: Pattern[];
  present: Pattern;
  future: Pattern[];
}
export function commit(history: History, pattern: Pattern): History {
  if (JSON.stringify(history.present) === JSON.stringify(pattern)) return history;
  return { past: [...history.past.slice(-99), history.present], present: pattern, future: [] };
}
export function undo(history: History): History {
  const previous = history.past.at(-1);
  return previous
    ? {
        past: history.past.slice(0, -1),
        present: previous,
        future: [history.present, ...history.future],
      }
    : history;
}
export function redo(history: History): History {
  const next = history.future[0];
  return next
    ? { past: [...history.past, history.present], present: next, future: history.future.slice(1) }
    : history;
}
