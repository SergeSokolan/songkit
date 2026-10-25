import { it, expect } from 'vitest';
import { createPattern, setHit } from '../../../entities/drum-pattern';
import { AuditionSelector } from './audition';
import { Scheduler } from './scheduler';
it('latches variants at entry, preserves one variant inside the interval and cancels immediately', () => {
  const p = createPattern(),
    a = setHit(p, 'snare', 960, 35),
    b = setHit(p, 'snare', 960, 115);
  const selector = new AuditionSelector();
  const first = { pattern: a, start: 960, end: 1920 },
    second = { ...first, pattern: b };
  expect(selector.resolve(p, first, 840)).toBe(p);
  expect(selector.resolve(p, first, 960).events).toEqual(a.events);
  expect(selector.resolve(p, second, 1080).events).toEqual(a.events);
  expect(selector.resolve(p, second, 1920)).toBe(p);
  expect(selector.resolve(p, second, 960).events).toEqual(b.events);
  expect(selector.resolve(p, undefined, 1080)).toBe(p);
  selector.reset();
  expect(selector.resolve(p, second, 1080)).toBe(p);
});
it('schedules preview events once in phrase context through the existing transport', () => {
  const p = setHit(createPattern(), 'kick', 0, 80);
  const candidate = { pattern: setHit(p, 'snare', 960, 35), start: 960, end: 1920 };
  const selector = new AuditionSelector();
  let time = 0;
  const hits: { tick: number; time: number }[] = [];
  const scheduler = new Scheduler(
    { now: () => time, hit: (e, t) => hits.push({ tick: e.tick, time: t }), silence: () => {} },
    (tick) => selector.resolve(p, candidate, tick),
  );
  scheduler.start();
  for (; time < 5; time += 0.01) scheduler.pump();
  const snare = hits.filter((h) => h.tick === 960);
  expect(snare).toHaveLength(2);
  expect(snare[1].time - snare[0].time).toBeCloseTo(2.4, 8);
  expect(hits.filter((h) => h.tick === 0)).toHaveLength(3);
});
