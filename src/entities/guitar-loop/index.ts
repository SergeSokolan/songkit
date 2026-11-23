// Strings run from low E to high E. A dash is a muted string.
export const shapes = {
  G: ['320003', '210003', 'соль', 'G major'],
  C: ['x32010', 'x32010', 'до', 'C major'],
  D: ['xx0232', 'xx0132', 'ре', 'D major'],
  Em: ['022000', '023000', 'ми минор', 'E minor'],
  Am: ['x02210', 'x02310', 'ля минор', 'A minor'],
  A: ['x02220', 'x01230', 'ля', 'A major'],
  Dm: ['xx0231', 'xx0231', 'ре минор', 'D minor'],
} as const;
export type Chord = keyof typeof shapes;
const rootNotes = { C: 0, A: 9, G: 7, E: 4, D: 2 } as const;
export type Form = keyof typeof rootNotes;
export function openForm(chord: Chord): Form {
  return chord[0] as Form;
}
export function chordForms(chord: Chord): Form[] {
  const base = openForm(chord);
  return [
    base,
    ...(Object.keys(rootNotes) as Form[])
      .filter((f) => f !== base)
      .sort((a, b) => offset(base, a) - offset(base, b)),
  ];
}
function offset(root: Form, form: Form) {
  return (rootNotes[root] - rootNotes[form] + 12) % 12;
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
  const root = openForm(chord);
  const shift = offset(root, form);
  const [pattern, fingers] = shift === 0 ? shapes[chord] : grips[form][chord.endsWith('m') ? 1 : 0];
  const frets = [...pattern].map((c) => (c === 'x' ? -1 : Number(c) + shift));
  const start = shift === 0 ? 1 : Math.min(...frets.filter((f) => f > 0));
  return { frets, fingers, start };
}
export const palettes = {
  G: ['Em', 'C', 'D', 'Am', 'G'],
  C: ['Am', 'G', 'Em', 'Dm', 'C'],
  D: ['G', 'A', 'Em', 'D'],
  Em: ['G', 'Am', 'C', 'D', 'Em'],
  Am: ['C', 'Dm', 'Em', 'G', 'Am'],
} as const satisfies Record<string, readonly Chord[]>;
export type Center = keyof typeof palettes;
export type Loop = {
  version: 1;
  center: Center;
  bars: Chord[];
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
    Object.hasOwn(palettes, v.center) &&
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
    v.bars.every((c) => (palettes[v.center!] as readonly Chord[]).includes(c)) &&
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
