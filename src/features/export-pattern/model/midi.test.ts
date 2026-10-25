import { describe, it, expect } from 'vitest';
import { parseMidi } from 'midi-file';
import {
  createPattern,
  resizePattern,
  setHit,
  setTempo,
  totalTicks,
} from '../../../entities/drum-pattern';
import { encodeMidi } from './midi';
describe('MIDI independent decoder', () => {
  it('encodes exact note timing, channel, velocity, tempo, meter and phrase end', () => {
    let p = setTempo(resizePattern(createPattern(), 4), 120);
    p = setHit(p, 'kick', 0, 115);
    p = setHit(p, 'snare', 120, 35);
    p = setHit(p, 'hat', 15240, 80);
    const midi = parseMidi(encodeMidi(p));
    expect(midi.header.ticksPerBeat).toBe(960);
    expect(midi.header.format).toBe(0);
    let tick = 0;
    const events = midi.tracks[0].map((e) => ({ ...e, tick: (tick += e.deltaTime) }));
    expect(events.find((e) => e.type === 'setTempo')).toMatchObject({
      microsecondsPerBeat: 500000,
    });
    expect(events.find((e) => e.type === 'timeSignature')).toMatchObject({
      numerator: 4,
      denominator: 4,
    });
    expect(events.filter((e) => e.type === 'noteOn')).toMatchObject([
      { tick: 0, channel: 9, noteNumber: 36, velocity: 115 },
      { tick: 120, channel: 9, noteNumber: 38, velocity: 35 },
      { tick: 15240, channel: 9, noteNumber: 42, velocity: 80 },
    ]);
    expect(events.filter((e) => e.type === 'noteOff')).toHaveLength(3);
    expect(events.at(-1)).toMatchObject({ type: 'endOfTrack', tick: totalTicks(p) });
  });
  it('exports an empty phrase without shortening it', () => {
    const events = parseMidi(encodeMidi(createPattern())).tracks[0];
    expect(events.at(-1)).toMatchObject({ type: 'endOfTrack', deltaTime: 3840 });
  });
});
