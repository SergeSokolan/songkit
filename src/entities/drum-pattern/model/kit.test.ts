import { describe, it, expect } from 'vitest';
import {
  BASE_INSTRUMENTS,
  INSTRUMENTS,
  addInstrument,
  createPattern,
  defaultView,
  displayInstruments,
  parseDraft,
  parsePattern,
  setHit,
  resizePattern,
  commit,
  undo,
  redo,
  type History,
} from './pattern';
describe('expandable drum kit', () => {
  it('keeps the base kit and orders tracks by physical height regardless of addition order', () => {
    let p = createPattern();
    expect(displayInstruments(p)).toEqual(['hat', 'snare', 'kick']);
    for (const instrument of ['crash2', 'tom2', 'ride', 'tom1', 'crash1', 'tom3'] as const)
      p = addInstrument(p, instrument);
    expect(displayInstruments(p)).toEqual([
      'crash2',
      'crash1',
      'ride',
      'hat',
      'tom1',
      'tom2',
      'tom3',
      'snare',
      'kick',
    ]);
    expect(p.instruments).toEqual([...INSTRUMENTS]);
    expect(addInstrument(p, 'tom1')).toBe(p);
    expect(() => addInstrument(p, 'unknown' as 'tom1')).toThrow('Неизвестный');
  });
  it('adds an empty track without changing time or hits, and supports undo/redo', () => {
    const original = setHit(createPattern(), 'snare', 120, 35);
    const h: History = { past: [], present: original, future: [] };
    const next = addInstrument(original, 'ride');
    expect(next.events).toEqual(original.events);
    expect(next.barCount).toBe(original.barCount);
    expect(original.instruments).toEqual([...BASE_INSTRUMENTS]);
    const changed = commit(h, next);
    expect(undo(changed).present).toEqual(original);
    expect(redo(undo(changed)).present).toEqual(next);
    expect(() => setHit(original, 'ride', 0, 80)).toThrow();
    expect(() =>
      parsePattern({ ...original, events: [{ instrument: 'ride', tick: 0, velocity: 80 }] }),
    ).toThrow();
  });
  it('round-trips the full kit and a maximum density phrase without losing velocity', () => {
    let p = resizePattern(createPattern(), 4);
    for (const instrument of INSTRUMENTS) p = addInstrument(p, instrument);
    for (const instrument of INSTRUMENTS)
      for (let i = 0; i < 128; i++) p = setHit(p, instrument, i * 120, 35 + (i % 93));
    expect(p.events).toHaveLength(1152);
    expect(parsePattern(p)).toEqual(p);
    expect(() => parsePattern({ ...p, events: [...p.events, p.events[0]] })).toThrow();
  });
  it('migrates old JSON and local drafts without altering their musical data', () => {
    const old = {
      schemaVersion: 1,
      tempo: 93,
      timeSignature: [4, 4],
      barCount: 1,
      events: [{ id: 'old', instrument: 'snare', tick: 120, velocity: 35 }],
    };
    const p = parsePattern(old);
    expect(p).toMatchObject({
      schemaVersion: 2,
      instruments: ['kick', 'snare', 'hat'],
      tempo: 93,
      events: [{ id: 'snare:120', instrument: 'snare', tick: 120, velocity: 35 }],
    });
    const restored = parseDraft({
      schemaVersion: 1,
      pattern: old,
      view: { ...defaultView, grid: 32, position: 120 },
    });
    expect(restored.pattern).toEqual(p);
    expect(restored.view.position).toBe(120);
    expect(() =>
      parsePattern({ ...old, events: [{ instrument: 'crash1', tick: 0, velocity: 80 }] }),
    ).toThrow();
  });
  it.each([
    undefined,
    null,
    'kick',
    [],
    ['kick', 'snare'],
    ['kick', 'snare', 'hat', 'hat'],
    ['kick', 'snare', 'hat', 'unknown'],
  ])('rejects invalid kit configuration %j', (instruments) => {
    expect(() => parsePattern({ ...createPattern(), instruments })).toThrow('Неверный набор');
  });
  it('rejects unsupported future schemas and excess events in a shorter phrase', () => {
    expect(() => parsePattern({ ...createPattern(), schemaVersion: 3 })).toThrow();
    expect(() =>
      parsePattern({
        ...createPattern(),
        events: Array(145).fill({ instrument: 'kick', tick: 0, velocity: 80 }),
      }),
    ).toThrow('Слишком много');
  });
});
