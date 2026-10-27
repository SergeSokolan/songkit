import { describe, it, expect } from 'vitest';
import {
  createPattern,
  setHit,
  gridTicks,
  parsePattern,
  parseDraft,
  defaultView,
  displayInstruments,
  addInstrument,
} from './pattern';
describe('backlog regressions', () => {
  it('orders toms without changing their identity or events', () => {
    let p = createPattern();
    for (const instrument of ['tom3', 'tom1', 'tom2'] as const)
      p = setHit(addInstrument(p, instrument), instrument, 0, 80);
    expect(displayInstruments(p)).toEqual(['hat', 'tom1', 'tom2', 'tom3', 'snare', 'kick']);
    expect(parsePattern(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
  it('accepts mixed straight and triplet ticks and restores triplet view', () => {
    let p = createPattern();
    for (const tick of [0, 120, 160, 240, 320, 480, 640, 800]) p = setHit(p, 'snare', tick, 80);
    expect(gridTicks('8T')).toBe(320);
    expect(gridTicks('16T')).toBe(160);
    expect(
      parseDraft({ schemaVersion: 1, pattern: p, view: { ...defaultView, grid: '16T' } }).view.grid,
    ).toBe('16T');
    expect(parsePattern(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
});
