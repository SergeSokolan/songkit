// Strings run from low E to high E. A dash is a muted string.
export const shapes = {
  G: ['320003', '210003', 'соль', 'G major'],
  C: ['x32010', 'x32010', 'до', 'C major'],
  D: ['xx0232', 'xx0132', 'ре', 'D major'],
  E: ['022100', '023100', 'ми', 'E major'],
  Em: ['022000', '023000', 'ми минор', 'E minor'],
  Am: ['x02210', 'x02310', 'ля минор', 'A minor'],
  A: ['x02220', 'x01230', 'ля', 'A major'],
  Dm: ['xx0231', 'xx0231', 'ре минор', 'D minor'],
} as const;
export const majors = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'D♭', 'A♭', 'E♭', 'B♭', 'F'] as const;
export const minors = [
  'Am',
  'Em',
  'Bm',
  'F♯m',
  'C♯m',
  'G♯m',
  'D♯m',
  'B♭m',
  'Fm',
  'Cm',
  'Gm',
  'Dm',
] as const;
export type Chord = (typeof majors)[number] | (typeof minors)[number];
export const chords: readonly Chord[] = [...majors, ...minors];
export function relations(chord: Chord) {
  const minor = chord.endsWith('m'),
    ring: readonly Chord[] = minor ? minors : majors,
    other = minor ? majors : minors;
  const i = ring.indexOf(chord),
    left = (i + 11) % 12,
    right = (i + 1) % 12;
  return {
    relative: other[i],
    neighbours: [ring[left], ring[right]],
    related: [other[left], other[right]],
  };
}
const rootNotes = { C: 0, A: 9, G: 7, E: 4, D: 2 } as const;
export type Form = keyof typeof rootNotes;
function rootNote(chord: Chord) {
  const i = chords.indexOf(chord);
  return (7 * (i % 12) + (i >= 12 ? 9 : 0)) % 12;
}
function offset(chord: Chord, form: Form) {
  return (rootNote(chord) - rootNotes[form] + 12) % 12;
}
export function isOpen(chord: Chord, form: Form) {
  return Object.hasOwn(shapes, chord) && form === chord[0];
}
export function chordForms(chord: Chord): Form[] {
  const list = Object.keys(rootNotes) as Form[];
  return list.sort(
    (a, b) =>
      Number(isOpen(chord, b)) - Number(isOpen(chord, a)) || offset(chord, a) - offset(chord, b),
  );
}
export function openForm(chord: Chord): Form {
  return chordForms(chord)[0];
}
export function chordName(chord: string, en: boolean) {
  const minor = chord.endsWith('m'),
    root = chord.replace(/m$/, '');
  const names: Record<string, string> = {
    A: 'ля',
    B: 'си',
    C: 'до',
    D: 'ре',
    E: 'ми',
    F: 'фа',
    G: 'соль',
  };
  return en
    ? root + (minor ? ' minor' : ' major')
    : names[root[0]] +
        ({ '♯': ' диез', '♭': ' бемоль', '♯♯': ' дубль-диез', '♭♭': ' дубль-бемоль' }[
          root.slice(1)
        ] ?? '') +
        (minor ? ' минор' : '');
}
// Movable fingerings. The compact C, G and D grips retain all three chord tones.
const grips = {
  C: [
    ['x3201x', 'x4312x'],
    ['x3101x', 'x4213x'],
  ],
  A: [
    ['x0222x', 'x1333x'],
    ['x02210', 'x13421'],
  ],
  G: [
    ['320xxx', '431xxx'],
    ['310xxx', '421xxx'],
  ],
  E: [
    ['022100', '134211'],
    ['022000', '134111'],
  ],
  D: [
    ['xxx232', 'xxx243'],
    ['xxx231', 'xxx342'],
  ],
} as const;

export function voicing(chord: Chord, form: Form = openForm(chord)) {
  const shift = offset(chord, form);
  const [pattern, fingers] = isOpen(chord, form)
    ? shapes[chord as keyof typeof shapes]
    : grips[form][chord.endsWith('m') ? 1 : 0];
  const frets = [...pattern].map((c) => (c === 'x' ? -1 : Number(c) + shift));
  const start = shift === 0 ? 1 : Math.min(...frets.filter((f) => f > 0));
  return { frets, fingers, start };
}
export type Center = Chord;
export type Loop = {
  version: 1;
  center: Center;
  bars: Chord[];
  labels?: string[];
  forms?: Form[];
  riffs?: (number[] | null)[];
  bpm: number;
};
export function validLoop(value: unknown): value is Loop {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<Loop>;
  return (
    v.version === 1 &&
    typeof v.center === 'string' &&
    chords.includes(v.center) &&
    Number.isInteger(v.bpm) &&
    v.bpm! >= 40 &&
    v.bpm! <= 180 &&
    Array.isArray(v.bars) &&
    v.bars.length >= 1 &&
    v.bars.length <= 4 &&
    (v.forms === undefined ||
      (Array.isArray(v.forms) &&
        v.forms.length === v.bars.length &&
        v.forms.every((f) => typeof f === 'string' && Object.hasOwn(rootNotes, f)))) &&
    v.bars.every((c) => chords.includes(c)) &&
    (v.labels === undefined ||
      (Array.isArray(v.labels) &&
        v.labels.length === v.bars.length &&
        v.labels.every((n, i) => validLabel(n, v.bars![i])))) &&
    (v.riffs === undefined ||
      (Array.isArray(v.riffs) &&
        v.riffs.length === v.bars.length &&
        v.riffs.every(
          (r, i) =>
            r === null ||
            (Array.isArray(r) &&
              r.length === 4 &&
              r.every(
                (n) =>
                  Number.isInteger(n) &&
                  (n === -1 ||
                    (n >= 0 && n < 6 && voicing(v.bars![i], v.forms?.[i]).frets[n] >= 0)),
              )),
        )))
  );
}
export function pitches(chord: Chord, form?: Form) {
  return voicing(chord, form).frets.flatMap((f, i) =>
    f < 0 ? [] : [[40, 45, 50, 55, 59, 64][i] + f],
  );
}

export function defaultRiff(frets: number[]) {
  const strings = frets.flatMap((f, i) => (f >= 0 ? [i] : [])).slice(-3);
  return [strings[0], strings[1], strings[2], strings[1]];
}

const letters = 'CDEFGAB';
const naturals = [0, 2, 4, 5, 7, 9, 11];
const scale = (chord: Chord) =>
  chord.endsWith('m') ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
function validLabel(name: unknown, chord: Chord) {
  if (
    typeof name !== 'string' ||
    !/^[A-G](♭{1,2}|♯{1,2})?m?$/.test(name) ||
    name.endsWith('m') !== chord.endsWith('m')
  )
    return false;
  const a = name.replace(/[A-Gm]/g, '');
  return (
    (naturals[letters.indexOf(name[0])] + (a.startsWith('♭') ? -1 : 1) * a.length + 12) % 12 ===
    rootNote(chord)
  );
}
export function spellChord(source: Chord, sourceName: string, target: Chord) {
  const degree = scale(source).indexOf((rootNote(target) - rootNote(source) + 12) % 12);
  if (degree < 0) return target;
  const letter = (letters.indexOf(sourceName[0]) + degree) % 7;
  const delta = ((rootNote(target) - naturals[letter] + 18) % 12) - 6;
  if (Math.abs(delta) > 2) return target;
  return (
    letters[letter] +
    (delta < 0 ? '♭' : '♯').repeat(Math.abs(delta)) +
    (target.endsWith('m') ? 'm' : '')
  );
}
export function inKey(key: Chord, target: Chord) {
  const root = rootNote(target),
    tonic = rootNote(key),
    degrees = scale(key);
  return [0, target.endsWith('m') ? 3 : 4, 7].every((n) =>
    degrees.includes((root + n - tonic + 12) % 12),
  );
}
