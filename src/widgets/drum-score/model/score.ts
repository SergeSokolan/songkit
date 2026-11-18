import { BAR_TICKS, PPQ, type DrumEvent, type Pattern } from '../../../entities/drum-pattern';

// Top to bottom on the percussion staff, with the VexFlow key at each position.
export const scoreKeys = {
  crash2: 'b/5/x',
  crash1: 'a/5/x',
  hat: 'g/5/x',
  ride: 'f/5/x',
  tom1: 'e/5',
  tom2: 'd/5',
  snare: 'c/5',
  tom3: 'a/4',
  kick: 'f/4',
} as const;

type Duration = 'w' | 'q' | '8' | '16' | '32';
type Hand = 'up' | 'down';
export interface ScoreNote {
  tick: number;
  duration: Duration;
  events: DrumEvent[];
  hidden?: boolean;
}
export interface ScoreVoice {
  stem: Hand;
  notes: ScoreNote[];
  tuplets: number[][];
  auxiliary?: boolean;
}

function straightBeat(notes: ScoreNote[], start: number, hits: Map<number, DrumEvent[]>) {
  const stops = [...hits.keys()].sort((a, b) => a - b);
  for (let tick = start; tick < start + PPQ;) {
    const end = stops.find((stop) => stop > tick) ?? start + PPQ;
    const choices = [
      [960, 'q'],
      [480, '8'],
      [240, '16'],
      [120, '32'],
    ] as const;
    const [length, duration] = choices.find(
      ([length]) => tick % length === 0 && tick + length <= end,
    )!;
    notes.push({ tick, duration, events: hits.get(tick) ?? [] });
    tick += length;
  }
}

function tripletBeat(
  voice: ScoreVoice,
  start: number,
  hits: Map<number, DrumEvent[]>,
  sharedAnchors?: Map<number, DrumEvent[]>,
) {
  // 3 eighths take one beat. A sixteenth-note triplet takes one half-beat.
  const pairs = [...hits.keys()].every((tick) => (tick - start) % 320 === 0) ? 1 : 2;
  const step = 320 / pairs;
  for (let group = 0; group < pairs; group++) {
    const first = start + group * 3 * step;
    if (![...hits.keys()].some((tick) => tick >= first && tick < first + 3 * step)) {
      voice.notes.push({ tick: first, duration: '8', events: [], hidden: voice.auxiliary });
      continue;
    }
    const indexes = [];
    for (let i = 0; i < 3; i++) {
      const tick = first + i * step;
      indexes.push(voice.notes.length);
      voice.notes.push({
        tick,
        duration: pairs === 1 ? '8' : '16',
        events: hits.get(tick) ?? [],
        hidden: sharedAnchors?.has(tick),
      });
    }
    voice.tuplets.push(indexes);
  }
}

export function scoreMeasure(pattern: Pattern, bar: number): ScoreVoice[] {
  const events = pattern.events.filter((event) => Math.floor(event.tick / BAR_TICKS) === bar);
  const voices: ScoreVoice[] = [];
  for (const stem of ['up', 'down'] as const) {
    const part = events.filter((event) => (event.instrument === 'kick') === (stem === 'down'));
    if (!part.length) continue;
    const primary: ScoreVoice = { stem, notes: [], tuplets: [] };
    const alternate: ScoreVoice = {
      stem: stem === 'up' ? 'down' : 'up',
      notes: [],
      tuplets: [],
      auxiliary: true,
    };
    let hasMixedBeat = false;
    for (let beat = 0; beat < 4; beat++) {
      const start = bar * BAR_TICKS + beat * PPQ;
      const grouped = new Map<number, DrumEvent[]>();
      for (const event of part) {
        if (event.tick < start || event.tick >= start + PPQ) continue;
        const group = grouped.get(event.tick) ?? [];
        group.push(event);
        grouped.set(event.tick, group);
      }
      const hasTriplet = [...grouped.keys()].some((tick) => tick % 120 !== 0);
      const hasStraight = [...grouped.keys()].some((tick) => tick % 160 !== 0);
      if (hasTriplet && !hasStraight) tripletBeat(primary, start, grouped);
      else {
        const straight = new Map([...grouped].filter(([tick]) => tick % 120 === 0));
        straightBeat(primary.notes, start, straight);
      }
      if (hasTriplet && hasStraight) {
        hasMixedBeat = true;
        tripletBeat(
          alternate,
          start,
          new Map([...grouped].filter(([tick]) => tick % 120 !== 0)),
          new Map([...grouped].filter(([tick]) => tick % 120 === 0)),
        );
      } else {
        alternate.notes.push({ tick: start, duration: 'q', events: [], hidden: true });
      }
    }
    voices.push(primary);
    if (hasMixedBeat) voices.push(alternate);
  }
  return voices.length
    ? voices
    : [{ stem: 'up', notes: [{ tick: bar * BAR_TICKS, duration: 'w', events: [] }], tuplets: [] }];
}
