import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  createPattern,
  resizePattern,
  setHit,
  addInstrument,
  parsePattern,
  commit,
  undo,
  redo,
  type History,
} from '../../../entities/drum-pattern';
import { applyFill, libraryFill, suggestFills, FILL_LIBRARY, type FillRange } from './fills';
const range: FillRange = { start: 13440, end: 15360, tracks: ['snare', 'hat'] };
const base = () => resizePattern(createPattern(), 4);
describe('fills', () => {
  it('preserves outside events, right boundary, nonselected tracks and the original model', () => {
    let p = setHit(base(), 'snare', 13200, 35);
    p = setHit(p, 'kick', 13440, 80);
    p = setHit(p, 'snare', 13440, 80);
    const r = { ...range, end: 14400 };
    p = setHit(p, 'snare', 14400, 80);
    const before = JSON.stringify(p);
    const next = applyFill(p, r, libraryFill(p, r, 'rock-snare'));
    expect(JSON.stringify(p)).toBe(before);
    expect(next.barCount).toBe(4);
    for (const e of p.events.filter(
      (e) => e.instrument === 'kick' || e.tick < r.start || e.tick >= r.end,
    ))
      expect(next.events).toContainEqual(e);
    expect(next.events.find((e) => e.tick === 13440 && e.instrument === 'snare')?.velocity).toBe(
      115,
    );
  });
  it('adds missing toms only by permission, as one undoable command', () => {
    const p = base();
    const r = { ...range, tracks: ['snare', 'tom1', 'tom2', 'tom3'] as FillRange['tracks'] };
    const f = libraryFill(p, r, 'rock-toms');
    expect(() => applyFill(p, r, f)).toThrow(/Подтвердите/);
    const next = applyFill(p, r, f, true);
    expect(next.instruments).toContain('tom3');
    const initial: History = { past: [], present: p, future: [] };
    const history = commit(initial, next);
    expect(undo(history).present).toEqual(p);
    expect(redo(undo(history)).present).toEqual(next);
  });
  it('validates ranges and events instead of silently truncating', () => {
    const p = base();
    const f = libraryFill(p, range, 'rock-snare');
    for (const r of [
      { ...range, start: -120 },
      { ...range, end: 16000 },
      { ...range, start: range.end },
      { ...range, tracks: [] },
      { ...range, start: 1 },
    ])
      expect(() => applyFill(p, r, f)).toThrow();
    expect(() =>
      applyFill(p, range, { ...f, events: [{ ...f.events[0], tick: range.end }] }),
    ).toThrow();
    expect(() =>
      applyFill(p, range, { ...f, events: [{ ...f.events[0], velocity: 128 }] }),
    ).toThrow();
  });
  it('provides three distinct deterministic variants and every library style', () => {
    const p = base();
    const list = suggestFills(p, range, 18);
    expect(list).toHaveLength(3);
    expect(suggestFills(p, range, 18)).toEqual(list);
    expect(new Set(list.map((f) => JSON.stringify(f.events))).size).toBe(3);
    expect(new Set(FILL_LIBRARY.map((f) => f.style))).toEqual(new Set(['rock', 'pop', 'funk']));
    for (const t of FILL_LIBRARY)
      expect(() =>
        parsePattern(
          applyFill(
            p,
            { ...range, tracks: ['snare', 'hat', 'tom1', 'tom2', 'tom3'] },
            libraryFill(p, { ...range, tracks: ['snare', 'hat', 'tom1', 'tom2', 'tom3'] }, t.id),
            true,
          ),
        ),
      ).not.toThrow();
  });
  it('respects two hands including preserved tracks and reports constrained intervals', () => {
    let p = addInstrument(base(), 'ride');
    p = setHit(p, 'ride', 13440, 80);
    p = setHit(p, 'hat', 13440, 80);
    const r = { ...range, tracks: ['snare'] as FillRange['tracks'] };
    for (const f of suggestFills(p, r)) expect(f.events.some((e) => e.tick === 13440)).toBe(false);
    expect(suggestFills(p, { start: 0, end: 120, tracks: ['snare'] })).toHaveLength(1);
    expect(suggestFills(p, { ...range, tracks: ['kick'] })).toEqual([]);
  });
  it('keeps integer grid, length, velocities, uniqueness and unaffected events for random intervals', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 126 }),
        fc.integer({ min: 1, max: 128 }),
        fc.integer({ min: 0, max: 10000 }),
        (start, length, seed) => {
          const p = setHit(base(), 'kick', 0, 80);
          const r = {
            start: start * 120,
            end: Math.min(128, start + length) * 120,
            tracks: ['snare', 'hat'] as FillRange['tracks'],
          };
          for (const f of suggestFills(p, r, seed)) {
            const next = applyFill(p, r, f);
            expect(parsePattern(JSON.parse(JSON.stringify(next)))).toEqual(next);
            expect(next.events).toContainEqual(p.events[0]);
            expect(new Set(next.events.map((e) => e.id)).size).toBe(next.events.length);
            expect(
              f.events.every(
                (e) =>
                  e.tick >= r.start &&
                  e.tick < r.end &&
                  e.tick % 120 === 0 &&
                  e.velocity > 0 &&
                  e.velocity <= 127,
              ),
            ).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
