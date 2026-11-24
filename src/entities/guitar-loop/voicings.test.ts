import { expect, test } from 'vitest';
import { chords, relations, chordForms, pitches, voicing } from './index';
test('all five grips fit the chart and preserve the major or minor triad', () => {
  const roots: Record<string, number> = {
    C: 0,
    'C♯': 1,
    'D♭': 1,
    D: 2,
    'D♯': 3,
    'E♭': 3,
    E: 4,
    F: 5,
    'F♯': 6,
    G: 7,
    'G♯': 8,
    'A♭': 8,
    A: 9,
    'B♭': 10,
    B: 11,
  };
  for (const chord of chords) {
    const forms = chordForms(chord);
    expect(new Set(forms).size).toBe(5);
    for (const form of forms) {
      const { frets, start, fingers } = voicing(chord, form);
      const intervals = new Set(
        pitches(chord, form).map((p) => (p - roots[chord.replace('m', '')]) % 12),
      );
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

test('relative pairs and their neighbours cover both rings', () => {
  for (const c of chords) {
    const r = relations(c);
    expect(new Set([c, r.relative, ...r.neighbours, ...r.related]).size).toBe(6);
    expect(relations(r.relative).relative).toBe(c);
    expect(r.related).toEqual(r.neighbours.map((n) => relations(n).relative));
  }
});
