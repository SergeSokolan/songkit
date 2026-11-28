import { expect, test } from 'vitest';
import { chordName, defaultRiff, pitches, validLoop, voicing } from './index';

const loop = { version: 1, bars: ['C'], center: 'Am', bpm: 120 };

test('loads legacy guitar bars and validates optional positions, names and playable riff strings', () => {
  expect(validLoop(loop)).toBe(true);
  expect(validLoop({ ...loop, forms: ['A'], labels: ['C'], riffs: [[1, 2, 3, -1]] })).toBe(true);
  expect(validLoop({ ...loop, riffs: [null] })).toBe(true);
  for (const invalid of [
    null,
    'C',
    { ...loop, bpm: 39 },
    { ...loop, bpm: 181 },
    { ...loop, bars: [] },
    { ...loop, forms: ['H'] },
    { ...loop, forms: [] },
    { ...loop, forms: 'A' },
    { ...loop, labels: [] },
    { ...loop, labels: 'C' },
    { ...loop, labels: ['Cm'] },
    { ...loop, riffs: [] },
    { ...loop, riffs: [0] },
    { ...loop, riffs: [[1]] },
    { ...loop, riffs: [[1, 2, 3, 6]] },
    { ...loop, riffs: [[0, 1, 2, 3]] },
  ])
    expect(validLoop(invalid)).toBe(false);
});

test('C in the A position sounds C major and its default riff uses playable strings', () => {
  const { frets } = voicing('C', 'A');
  expect(pitches('C', 'A')).toEqual([48, 55, 60, 64]);
  expect(defaultRiff(frets)).toEqual([2, 3, 4, 3]);
  expect(chordName('C', true)).toBe('C major');
  expect(chordName('B♭m', false)).toBe('си бемоль минор');
  expect(chordName('Am', true)).toBe('A minor');
});
