import {
  type Center,
  majors,
  minors,
  relations,
  spellChord,
  type Chord,
} from '../../entities/guitar-loop';
export function KeyCircle({
  center,
  sourceName,
  en,
}: {
  center: Center;
  sourceName: string;
  en: boolean;
}) {
  const { relative, neighbours, related } = relations(center);
  const label = (c: Chord) => spellChord(center, sourceName, c);
  return (
    <figure className="key-circle">
      <svg aria-hidden="true" viewBox="0 0 300 300">
        {[majors, minors].map((row, level) =>
          row.map((name, j) => {
            const a = (j * Math.PI) / 6,
              r = level ? 88 : 130,
              x = 150 + r * Math.sin(a),
              y = 150 - r * Math.cos(a);
            const color =
              name === center
                ? '#1f4784'
                : name === relative
                  ? '#ffe49a'
                  : neighbours.includes(name)
                    ? '#92e1d3'
                    : related.includes(name)
                      ? '#e5c8ff'
                      : undefined;
            return (
              <g key={name}>
                {color && (
                  <circle
                    cx={x}
                    cy={y}
                    r={level ? 18 : 19}
                    fill={color}
                    stroke="currentColor"
                    strokeWidth={name === center ? 2 : 1}
                  />
                )}
                <text
                  x={x}
                  y={y + 5}
                  textAnchor="middle"
                  fill={name === center ? 'white' : color ? '#17232a' : 'currentColor'}
                  fontWeight={neighbours.includes(name) || name === relative ? 800 : 500}
                  textDecoration={
                    neighbours.includes(name) || name === relative ? 'underline' : undefined
                  }
                >
                  {color ? label(name) : name}
                </text>
              </g>
            );
          }),
        )}
      </svg>
      <figcaption>
        {sourceName} · {en ? 'Neighbours' : 'Соседи'}: {neighbours.map(label).join(', ')}.{' '}
        {en ? 'Relative key' : 'Параллельная тональность'}: {label(relative)}.{' '}
        {en ? 'Relatives of neighbours' : 'Параллельные тональности соседей'}:{' '}
        {related.map(label).join(', ')}.
      </figcaption>
    </figure>
  );
}
