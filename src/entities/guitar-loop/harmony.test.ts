import { expect, test } from 'vitest';
import { chords, relations, spellChord, inKey, validLoop } from './index';
test('all 120 names use the letter of the expected diatonic degree and sound the target triad', () => {
  const letters = 'CDEFGAB';
  for (const source of chords) {
    const r = relations(source),
      offsets = source.endsWith('m') ? [2, 3, 4, 5, 6] : [5, 3, 4, 1, 2];
    [r.relative, ...r.neighbours, ...r.related].forEach((target, i) => {
      const label = spellChord(source, source, target);
      expect(label[0]).toBe(letters[(letters.indexOf(source[0]) + offsets[i]) % 7]);
      expect(
        validLoop({ version: 1, bars: [target], labels: [label], center: source, bpm: 120 }),
      ).toBe(true);
      expect(inKey(source, target)).toBe(true);
    });
  }
  expect(spellChord('F♯', 'F♯', 'D♭')).toBe('C♯');
  expect(spellChord('D♭', 'D♭', 'F♯')).toBe('G♭');
  expect(inKey('Am', 'B♭')).toBe(false);
  expect(inKey('Am', 'E')).toBe(false);
  expect(validLoop({ version: 1, bars: ['Am'], center: 'Am', bpm: 120 })).toBe(true);
  expect(validLoop({ version: 1, bars: ['Am'], labels: ['Cm'], center: 'Am', bpm: 120 })).toBe(
    false,
  );
});
