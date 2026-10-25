import { PPQ, parsePattern, totalTicks, type Pattern } from '../../../entities/drum-pattern';
const notes = { kick: 36, snare: 38, hat: 42 };
function variable(value: number): number[] {
  const result = [value & 127];
  while ((value = Math.floor(value / 128)) > 0) result.unshift((value & 127) | 128);
  return result;
}
function chunk(name: string, bytes: number[]): number[] {
  return [...name]
    .map((c) => c.charCodeAt(0))
    .concat(
      [
        (bytes.length >>> 24) & 255,
        (bytes.length >>> 16) & 255,
        (bytes.length >>> 8) & 255,
        bytes.length & 255,
      ],
      bytes,
    );
}
export function encodeMidi(input: Pattern): Uint8Array<ArrayBuffer> {
  const pattern = parsePattern(input);
  const tempo = Math.round(60_000_000 / pattern.tempo);
  const track = [
    0,
    255,
    81,
    3,
    (tempo >>> 16) & 255,
    (tempo >>> 8) & 255,
    tempo & 255,
    0,
    255,
    88,
    4,
    4,
    2,
    24,
    8,
  ];
  const events = pattern.events
    .flatMap((e) => [
      { tick: e.tick, bytes: [0x99, notes[e.instrument], e.velocity] },
      { tick: e.tick + 60, bytes: [0x89, notes[e.instrument], 0] },
    ])
    .sort((a, b) => a.tick - b.tick || a.bytes[0] - b.bytes[0]);
  let previous = 0;
  for (const event of events) {
    track.push(...variable(event.tick - previous), ...event.bytes);
    previous = event.tick;
  }
  track.push(...variable(totalTicks(pattern) - previous), 255, 47, 0);
  return new Uint8Array([
    ...chunk('MThd', [0, 0, 0, 1, (PPQ >>> 8) & 255, PPQ & 255]),
    ...chunk('MTrk', track),
  ]);
}
