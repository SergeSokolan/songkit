import { describe, it, expect } from 'vitest';
import { parseMidi } from 'midi-file';
import {
  BAR_TICKS,
  INSTRUMENTS,
  addInstrument,
  createPattern,
  resizePattern,
  parseDraft,
  defaultView,
  commit,
  undo,
  redo,
  setHit,
  moveHit,
  gridSteps,
  gridLabel,
} from '../../entities/drum-pattern';
import { FILL_CATALOG, catalogFill, applyFill } from '../../features/manage-fills';
import { GROOVE_CATALOG, grooveCandidate } from '../../features/manage-grooves';
import { encodeMidi } from '../../features/export-pattern';
// This test lives at the page layer: integration across feature public APIs.
describe('musical catalogs and independent export', () => {
  it.each(['rock', 'metal', 'pop', 'funk', 'jazz'])(
    '%s has complete fill lengths and three grooves',
    (genre) => {
      for (const beats of [1, 2, 4])
        expect(
          FILL_CATALOG.filter((c) => c.style === genre && c.beats === beats).length,
        ).toBeGreaterThanOrEqual(2);
      expect(GROOVE_CATALOG.filter((c) => c.style === genre)).toHaveLength(3);
    },
  );
  for (const card of FILL_CATALOG)
    it(card.id + ' applies only inside the chosen bar and tracks, undoable, exact MIDI', () => {
      let p = resizePattern(createPattern(), 4);
      for (const instrument of INSTRUMENTS) p = addInstrument(p, instrument);
      for (let bar = 0; bar < 4; bar++)
        for (const instrument of INSTRUMENTS) p = setHit(p, instrument, bar * BAR_TICKS, 115);
      const { fill, range } = catalogFill(p, 2, card.id);
      const applied = applyFill(p, range, fill);
      expect(applied.barCount).toBe(4);
      expect(applied.timeSignature).toEqual([4, 4]);
      expect(
        applied.events.filter(
          (e) =>
            e.tick < range.start || e.tick >= range.end || !range.tracks.includes(e.instrument),
        ),
      ).toEqual(
        p.events.filter(
          (e) =>
            e.tick < range.start || e.tick >= range.end || !range.tracks.includes(e.instrument),
        ),
      );
      expect(fill.events.every((e) => e.tick >= range.start && e.tick < range.end)).toBe(true);
      expect(fill.events).toHaveLength(card.events.length);
      const h = commit({ past: [], present: p, future: [] }, applied);
      expect(undo(h).present).toEqual(p);
      expect(redo(undo(h)).present).toEqual(applied);
      const draft = parseDraft(
        JSON.parse(
          JSON.stringify({
            schemaVersion: 1,
            pattern: applied,
            view: { ...defaultView, grid: '16T' },
          }),
        ),
      );
      expect(draft.pattern).toEqual(applied);
      let tick = 0;
      const notes = parseMidi(encodeMidi(applied))
        .tracks[0].map((e) => ({ ...e, tick: (tick += e.deltaTime) }))
        .filter((e) => e.type === 'noteOn');
      expect(notes.map((e) => [e.tick, e.velocity])).toEqual(
        applied.events.map((e) => [e.tick, e.velocity]),
      );
    });
  for (const card of GROOVE_CATALOG)
    it(card.id + ' repeats complete bars without changing tempo or unrelated tracks', () => {
      let p = resizePattern(createPattern(), 4);
      p = setHit(addInstrument(p, 'crash1'), 'crash1', 0, 115);
      const { fill, range } = grooveCandidate(p, 1, 3, card.id);
      const applied = applyFill(p, range, fill, true);
      expect(applied.tempo).toBe(p.tempo);
      expect(applied.events).toContainEqual(p.events[0]);
      expect(fill.events).toHaveLength(card.events.length * 3);
      expect(
        fill.events.filter((e) => e.tick >= 3840 && e.tick < 7680).map((e) => e.tick - 3840),
      ).toEqual(card.events.map((e) => e.tick));
      expect(parseDraft({ schemaVersion: 1, pattern: applied, view: defaultView }).pattern).toEqual(
        applied,
      );
    });
  it('rejects missing tracks instead of silently changing a card', () => {
    const p = createPattern();
    const { fill, range } = catalogFill(p, 0, 'metal-rlkk-1');
    expect(() => applyFill(p, range, fill)).toThrow('Подтвердите');
    expect(applyFill(p, range, fill, true).instruments).toContain('tom1');
    expect(() => catalogFill(p, -1, 'metal-rlkk-1')).toThrow();
    expect(() => catalogFill(p, 0, 'unknown')).toThrow();
    expect(() => grooveCandidate(p, 0, 1, 'rock-basic')).toThrow();
  });
  it('preserves triplet velocity on movement and rejects unsupported positions', () => {
    const p = setHit(createPattern(), 'snare', 160, 35);
    expect(moveHit(p, 'snare', 160, 320).events[0]).toMatchObject({ tick: 320, velocity: 35 });
    expect(() => setHit(p, 'snare', 40, 80)).toThrow();
    expect(gridSteps('8T')).toBe(12);
    expect(gridSteps('16T')).toBe(24);
    expect(gridLabel('16T')).toBe('1/16T');
  });
});
