import {
  Articulation,
  Beam,
  Font,
  Formatter,
  GhostNote,
  Modifier,
  Parenthesis,
  Renderer,
  Stave,
  StaveNote,
  Stem,
  Tuplet,
  VexFlow,
  Voice,
} from 'vexflow/core';
import { strengthOf, type Instrument, type Pattern } from '../../../entities/drum-pattern';
import { scoreMeasure } from '../model/score';

// Written positions for percussion clef, independent of MIDI pitches.
export const keys: Record<Instrument, string> = {
  kick: 'f/4',
  snare: 'c/5',
  tom1: 'e/5',
  tom2: 'd/5',
  tom3: 'a/4',
  hat: 'g/5/x',
  ride: 'f/5/x',
  crash1: 'a/5/x',
  crash2: 'b/5/x',
};

VexFlow.setFonts('Bravura');
VexFlow.setTextFonts('Arial');
export const scoreFont = Font.load('Bravura', `${import.meta.env.BASE_URL}fonts/bravura.woff2`);

export function engrave(container: HTMLDivElement, pattern: Pattern, bar: number) {
  const beams: Beam[] = [];
  const tuplets: Tuplet[] = [];
  const voices = scoreMeasure(pattern, bar).map(({ stem, notes, tuplets: groups }) => {
    const direction = stem === 'up' ? Stem.UP : Stem.DOWN;
    const glyphs = notes.map(({ duration, events, hidden }) => {
      if (hidden) return new GhostNote(duration);
      const note = new StaveNote({
        keys: events.length
          ? events.map((event) => keys[event.instrument])
          : [stem === 'up' ? 'd/5' : 'g/4'],
        duration: events.length ? duration : `${duration}r`,
        stemDirection: direction,
        clef: 'percussion',
        alignCenter: duration === 'w',
      });
      for (const [index, event] of events.entries()) {
        const strength = strengthOf(event.velocity);
        if (strength === 'ghost') {
          note.addModifier(new Parenthesis(Modifier.Position.LEFT), index);
          note.addModifier(new Parenthesis(Modifier.Position.RIGHT), index);
        } else if (strength === 'accent') {
          note.addModifier(
            new Articulation('a>').setPosition(
              stem === 'up' ? Modifier.Position.ABOVE : Modifier.Position.BELOW,
            ),
            index,
          );
        }
      }
      return note;
    });
    for (const group of groups) {
      tuplets.push(
        new Tuplet(
          group.map((index) => glyphs[index]),
          { location: direction },
        ),
      );
    }
    beams.push(...Beam.generateBeams(glyphs, { maintainStemDirections: true }));
    return new Voice({ numBeats: 4, beatValue: 4 }).addTickables(glyphs);
  });

  const formatter = new Formatter().joinVoices(voices);
  const width = Math.max(320, Math.ceil(formatter.preCalculateMinTotalWidth(voices) * 1.2 + 100));
  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, 240);
  const context = renderer.getContext();
  const color = getComputedStyle(container).color;
  context.setFillStyle(color).setStrokeStyle(color);
  const stave = new Stave(12, 78, width - 24).addClef('percussion').addTimeSignature('4/4');
  stave.setContext(context).draw();
  formatter.formatToStave(voices, stave);
  for (const voice of voices) voice.draw(context, stave);
  for (const beam of beams) beam.setContext(context).draw();
  for (const tuplet of tuplets) tuplet.setContext(context).draw();
}
