import { it, expect } from 'vitest';
import { parseMidi } from 'midi-file';
import {
  createPattern,
  resizePattern,
  defaultView,
  parsePattern,
  INSTRUMENT_DETAILS,
} from '../../entities/drum-pattern';
import { applyFill, libraryFill } from '../../features/manage-fills';
import { saveDraft, loadDraft } from '../../features/draft-recovery';
import { encodeMidi } from '../../features/export-pattern';
it('round-trips an applied tom fill through JSON, IndexedDB and independently decoded MIDI', async () => {
  const p = resizePattern(createPattern(), 4);
  const range = { start: 13440, end: 15360, tracks: ['snare', 'tom1', 'tom2', 'tom3'] as const };
  const r = { ...range, tracks: [...range.tracks] };
  const next = applyFill(p, r, libraryFill(p, r, 'rock-toms'), true);
  expect(parsePattern(JSON.parse(JSON.stringify(next)))).toEqual(next);
  await saveDraft({ schemaVersion: 1, pattern: next, view: defaultView });
  expect((await loadDraft())?.pattern).toEqual(next);
  const midi = parseMidi(encodeMidi(next));
  let tick = 0;
  const events = midi.tracks[0].map((e) => ({ ...e, tick: (tick += e.deltaTime) }));
  const notes = events.filter((e) => e.type === 'noteOn');
  expect(notes).toHaveLength(next.events.length);
  for (const e of next.events)
    expect(notes).toContainEqual(
      expect.objectContaining({
        tick: e.tick,
        noteNumber: INSTRUMENT_DETAILS[e.instrument].midiNote,
        velocity: e.velocity,
        channel: 9,
      }),
    );
  expect(events.at(-1)?.tick).toBe(15360);
});
