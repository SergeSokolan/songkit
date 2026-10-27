import { describe, it, expect, vi } from 'vitest';
import {
  createPattern,
  setHit,
  setTempo,
  resizePattern,
  type Pattern,
} from '../../../entities/drum-pattern';
import { Scheduler } from './scheduler';
function fixture(initial = createPattern()) {
  let time = 0;
  let pattern: Pattern = initial;
  const hits: { tick: number; time: number; velocity: number }[] = [];
  const silence = vi.fn();
  const scheduler = new Scheduler(
    {
      now: () => time,
      hit: (e, t) => hits.push({ tick: e.tick, time: t, velocity: e.velocity }),
      silence,
    },
    () => pattern,
  );
  return {
    scheduler,
    hits,
    silence,
    setTime: (t: number) => {
      time = t;
    },
    setPattern: (p: Pattern) => {
      pattern = p;
    },
    advance: (until: number) => {
      for (; time < until; time += 0.01) scheduler.pump();
    },
  };
}
describe('audio-clock scheduling', () => {
  it('starts once, schedules simultaneous events at the same precise audio time', () => {
    let p = setHit(createPattern(), 'kick', 0, 80);
    p = setHit(p, 'hat', 0, 35);
    const f = fixture(p);
    f.scheduler.start();
    f.scheduler.start();
    expect(f.hits).toHaveLength(2);
    expect(f.hits[0].time).toBe(0.025);
    expect(f.hits[1].time).toBe(0.025);
    expect(f.scheduler.isRunning()).toBe(true);
  });
  it('loops without duplicate or missing 32nd hits', () => {
    let p = setTempo(createPattern(), 120);
    for (let i = 0; i < 32; i++) p = setHit(p, 'hat', i * 120, 80);
    const f = fixture(p);
    f.scheduler.start();
    f.advance(4);
    expect(f.hits.length).toBeGreaterThanOrEqual(64);
    for (let i = 1; i < 64; i++) expect(f.hits[i].time - f.hits[i - 1].time).toBeCloseTo(0.0625, 8);
  });
  it('reads live edits for unscheduled events', () => {
    const f = fixture(setTempo(createPattern(), 120));
    f.scheduler.start();
    f.setPattern(setHit(setTempo(createPattern(), 120), 'snare', 480, 35));
    f.advance(0.25);
    expect(f.hits).toHaveLength(1);
    expect(f.hits[0]).toMatchObject({ tick: 480, velocity: 35 });
    expect(f.hits[0].time).toBeCloseTo(0.275);
  });
  it('stops sources, clears queue and resumes from stopped position', () => {
    const f = fixture(setHit(createPattern(), 'kick', 0, 80));
    f.scheduler.start();
    f.setTime(0.19);
    expect(f.scheduler.currentPosition()).toBe(40);
    f.scheduler.pump();
    f.setTime(0.2);
    const stopped = f.scheduler.stop();
    // Position now advances in 40-tick steps to cover straight and triplet events.
    expect(stopped).toBe(280);
    expect(f.silence).toHaveBeenCalledTimes(1);
    expect(f.scheduler.isRunning()).toBe(false);
    const n = f.hits.length;
    f.setTime(1);
    f.scheduler.pump();
    expect(f.hits).toHaveLength(n);
    f.scheduler.start(stopped);
    expect(f.scheduler.isRunning()).toBe(true);
  });
  it('discards stale background queue rather than emitting a burst', () => {
    const f = fixture(setHit(createPattern(), 'kick', 0, 80));
    f.scheduler.start();
    f.setTime(10);
    f.scheduler.pump();
    expect(f.scheduler.isRunning()).toBe(false);
    expect(f.hits).toHaveLength(1);
  });
  it('applies tempo at the next quarter boundary', () => {
    let p = setTempo(createPattern(), 120);
    for (let i = 0; i < 32; i++) p = setHit(p, 'hat', i * 120, 80);
    const f = fixture(p);
    f.scheduler.start();
    f.setPattern(setTempo(p, 60));
    f.advance(1);
    const beat = f.hits.findIndex((h) => h.tick === 960);
    expect(f.hits[beat].time).toBeCloseTo(0.525);
    expect(f.hits[beat + 1].time - f.hits[beat].time).toBeCloseTo(0.125);
  });
  it('changes phrase length at a bar boundary', () => {
    const p = setHit(resizePattern(setTempo(createPattern(), 120), 2), 'kick', 3840, 80);
    const f = fixture(p);
    f.scheduler.start();
    f.setPattern(resizePattern(p, 1));
    f.advance(2.3);
    expect(f.hits).toHaveLength(0);
  });
});

it('schedules sextuplets and mixed straight notes at exact audio times', () => {
  let p = setTempo(createPattern(), 120);
  for (const tick of [0, 120, 160, 320, 480, 640, 800]) p = setHit(p, 'snare', tick, 80);
  const f = fixture(p);
  f.scheduler.start();
  f.advance(0.5);
  expect(f.hits.map((e) => e.tick)).toEqual([0, 120, 160, 320, 480, 640, 800]);
  for (const e of f.hits) expect(e.time).toBeCloseTo(0.025 + (e.tick / 960) * 0.5, 8);
});
