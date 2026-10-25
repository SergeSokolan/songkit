import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  BAR_TICKS,
  PPQ,
  VELOCITIES,
  commit,
  createPattern,
  defaultView,
  demoPattern,
  eventId,
  gridTicks,
  moveHit,
  parseDraft,
  parsePattern,
  redo,
  resizePattern,
  setHit,
  setTempo,
  strengthOf,
  totalTicks,
  undo,
  type History,
  type Pattern,
} from './pattern';
describe('musical model', () => {
  it('keeps exact 32nd positions inside 4/4 for arbitrary bars', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), fc.integer({ min: 0, max: 31 }), (bars, step) => {
        const p = resizePattern(createPattern(), bars);
        const tick = (bars - 1) * BAR_TICKS + step * gridTicks(32);
        const result = setHit(p, 'snare', tick, 35);
        expect(totalTicks(result)).toBe(bars * PPQ * 4);
        expect(result.events[0].tick).toBe(tick);
        expect(result.events[0].tick).toBeLessThan(totalTicks(result));
        expect(parsePattern(result)).toEqual(result);
      }),
    );
  });
  it('updates and removes hits without duplicates or mutation', () => {
    const original = createPattern();
    let p = setHit(original, 'kick', 0, 80);
    p = setHit(p, 'kick', 0, 35);
    p = setHit(p, 'snare', 0, 115);
    expect(original.events).toEqual([]);
    expect(p.events).toHaveLength(2);
    expect(p.events.find((e) => e.instrument === 'kick')?.velocity).toBe(35);
    expect(setHit(p, 'kick', 0, null).events).toHaveLength(1);
  });
  it('moves atomically, replaces destination, and preserves velocity', () => {
    let p = setHit(createPattern(), 'snare', 0, 35);
    p = setHit(p, 'snare', 120, 80);
    const moved = moveHit(p, 'snare', 0, 120);
    expect(moved.events).toEqual([
      { id: 'snare:120', instrument: 'snare', tick: 120, velocity: 35 },
    ]);
    expect(moveHit(p, 'kick', 0, 120)).toBe(p);
    expect(moveHit(p, 'snare', 0, 0)).toBe(p);
  });
  it('does not change events when changing the display grid', () => {
    const p = setHit(createPattern(), 'hat', 120, 80);
    const before = JSON.stringify(p);
    for (const grid of [4, 8, 16, 32] as const) expect(gridTicks(grid)).toBe(3840 / grid);
    expect(JSON.stringify(p)).toBe(before);
    expect(eventId('hat', 120)).toBe('hat:120');
  });
  it('cuts only events beyond the new phrase, and can undo/redo resize', () => {
    const p = setHit(resizePattern(createPattern(), 4), 'snare', BAR_TICKS * 3, 80);
    const history: History = { past: [], present: p, future: [] };
    const changed = commit(history, resizePattern(p, 1));
    expect(changed.present.events).toEqual([]);
    expect(undo(changed).present).toEqual(p);
    expect(redo(undo(changed))).toEqual(changed);
    expect(undo(history)).toBe(history);
    expect(redo(history)).toBe(history);
    expect(commit(history, p)).toBe(history);
    expect(commit(undo(changed), setTempo(p, 120)).future).toEqual([]);
    let limited = history;
    for (let i = 0; i < 120; i++) limited = commit(limited, setTempo(p, 40 + i));
    expect(limited.past).toHaveLength(100);
  });
  it('rejects invalid edits and respects tempo/strength limits', () => {
    const p = createPattern();
    for (const tick of [-120, 3840, 1, NaN, 0.5])
      expect(() => setHit(p, 'kick', tick, 80)).toThrow();
    expect(() => setHit(p, 'invalid' as 'kick', 0, 80)).toThrow();
    for (const v of [0, 128, 1.5, NaN]) expect(() => setHit(p, 'kick', 0, v)).toThrow();
    for (const bars of [0, 5, 1.5]) expect(() => resizePattern(p, bars)).toThrow();
    for (const tempo of [39, 241, 50.5]) expect(() => setTempo(p, tempo)).toThrow();
    expect(setTempo(p, 40).tempo).toBe(40);
    expect(setTempo(p, 240).tempo).toBe(240);
    expect(strengthOf(35)).toBe('ghost');
    expect(strengthOf(80)).toBe('normal');
    expect(strengthOf(115)).toBe('accent');
    expect(VELOCITIES.ghost).toBeLessThan(VELOCITIES.normal);
    expect(demoPattern().events.length).toBe(13);
  });
});
describe('untrusted project and draft input', () => {
  it('round-trips and strips arbitrary fields / untrusted ids', () => {
    const p = demoPattern();
    const input = {
      ...p,
      extra: 'ignored',
      events: p.events.map((e) => ({ ...e, id: 'untrusted' })),
    };
    expect(parsePattern(input)).toEqual(p);
    const draft = { schemaVersion: 1, pattern: p, view: defaultView };
    expect(parseDraft(draft)).toEqual(draft);
    expect(
      parsePattern({ ...p, events: [...p.events].reverse() }).events.map((e) => e.tick),
    ).toEqual(p.events.map((e) => e.tick));
  });
  it.each([
    null,
    undefined,
    2,
    'bad',
    [],
    {},
    { schemaVersion: 2 },
    { ...createPattern(), timeSignature: null },
    { ...createPattern(), timeSignature: [4] },
    { ...createPattern(), timeSignature: [3, 4] },
    { ...createPattern(), timeSignature: [4, 8] },
    { ...createPattern(), tempo: 39 },
    { ...createPattern(), tempo: 241 },
    { ...createPattern(), tempo: 50.5 },
    { ...createPattern(), barCount: 0 },
    { ...createPattern(), barCount: 5 },
    { ...createPattern(), barCount: 1.5 },
    { ...createPattern(), events: null },
    { ...createPattern(), events: Array(385).fill({}) },
  ])('rejects invalid project %j', (input) => expect(() => parsePattern(input)).toThrow());
  it.each([
    null,
    2,
    {},
    { instrument: 'tom', tick: 0, velocity: 80 },
    { instrument: 'kick', tick: -120, velocity: 80 },
    { instrument: 'kick', tick: 3840, velocity: 80 },
    { instrument: 'kick', tick: 1, velocity: 80 },
    { instrument: 'kick', tick: 0.1, velocity: 80 },
    { instrument: 'kick', tick: 0, velocity: 0 },
    { instrument: 'kick', tick: 0, velocity: 128 },
    { instrument: 'kick', tick: 0, velocity: 1.1 },
  ])('rejects invalid event %j', (e) =>
    expect(() => parsePattern({ ...createPattern(), events: [e] })).toThrow(),
  );
  it('rejects duplicates instead of double triggering', () => {
    const p = setHit(createPattern(), 'kick', 0, 80);
    expect(() => parsePattern({ ...p, events: [p.events[0], p.events[0]] })).toThrow(
      'Повторяющиеся',
    );
  });
  it.each([
    null,
    2,
    {},
    { schemaVersion: 2, view: {} },
    { schemaVersion: 1, pattern: createPattern(), view: null },
    { schemaVersion: 1, pattern: createPattern(), view: 4 },
  ])('rejects invalid draft envelope %j', (d) => expect(() => parseDraft(d)).toThrow());
  it.each([
    { bar: -1 },
    { bar: 1 },
    { bar: 0.5 },
    { grid: 3 },
    { grid: '8' },
    { position: -1 },
    { position: 3840 },
    { position: 0.5 },
    { scrollLeft: -1 },
    { scrollLeft: Infinity },
    { scrollLeft: '1' },
  ])('rejects invalid view %j', (patch) =>
    expect(() =>
      parseDraft({
        schemaVersion: 1,
        pattern: createPattern(),
        view: { ...defaultView, ...patch },
      }),
    ).toThrow(),
  );
  it('round-trips all boundary velocities and bars', () => {
    for (const velocity of [1, 127]) {
      const p = setHit(resizePattern(createPattern(), 4), 'hat', 15240, velocity);
      expect(parsePattern(p)).toEqual(p);
    }
    expect(parsePattern({ ...createPattern(), tempo: 240 }) as Pattern).toBeTruthy();
  });
});
