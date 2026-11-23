import { expect, test } from 'vitest';
import { shapes, chordForms, pitches, voicing, type Chord } from './index';
test('all five grips fit the chart and preserve the major or minor triad', () => {
  const roots = { G: 7, C: 0, D: 2, Em: 4, Am: 9, A: 9, Dm: 2 };
  for (const chord of Object.keys(shapes) as Chord[]) {
    const forms = chordForms(chord);
    expect(new Set(forms).size).toBe(5);
    for (const form of forms) {
      const { frets, start, fingers } = voicing(chord, form);
      const intervals = new Set(pitches(chord, form).map((p) => (p - roots[chord]) % 12));
      expect(intervals).toEqual(new Set([0, chord.endsWith('m') ? 3 : 4, 7]));
      frets.forEach((f, i) => {
        if (f > 0) {
          expect(f).toBeGreaterThanOrEqual(start);
          expect(f).toBeLessThan(start + 4);
          expect(fingers[i]).toMatch(/[1-4]/);
        }
      });
    }
  }
});
