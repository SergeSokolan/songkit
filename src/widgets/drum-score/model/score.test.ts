import { expect, test } from 'vitest';
import { BAR_TICKS, createPattern, setHit } from '../../../entities/drum-pattern';
import { scoreMeasure } from './score';

test('straight and triplet layers keep every hit exactly once and fill each bar', () => {
  const ticks = [0, 120, 160, 240, 320, 360, 480, 600, 640, 720, 800, 840, 3720, 3840, 4000];
  let pattern = { ...createPattern(), barCount: 2 };
  for (const tick of ticks) pattern = setHit(pattern, 'snare', tick, tick === 160 ? 35 : 80);
  pattern = setHit(pattern, 'kick', 0, 115);
  const engraved = [];
  for (const bar of [0, 1]) {
    for (const voice of scoreMeasure(pattern, bar)) {
      const tripletIndices = new Set(voice.tuplets.flat());
      let tick = bar * BAR_TICKS;
      for (const [index, note] of voice.notes.entries()) {
        expect(note.tick).toBe(tick);
        engraved.push(...note.events);
        const length = { w: BAR_TICKS, q: 960, '8': 480, '16': 240, '32': 120 }[note.duration];
        tick += tripletIndices.has(index) ? (length * 2) / 3 : length;
      }
      expect(tick).toBe((bar + 1) * BAR_TICKS);
    }
  }
  expect(engraved.map(({ id }) => id).sort()).toEqual(pattern.events.map(({ id }) => id).sort());
});

test('a silent bar has one centered measure rest in one voice', () => {
  expect(scoreMeasure(createPattern(), 0)).toEqual([
    { stem: 'up', notes: [{ tick: 0, duration: 'w', events: [] }], tuplets: [] },
  ]);
});
