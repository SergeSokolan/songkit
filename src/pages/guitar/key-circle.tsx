import { type Center } from '../../entities/guitar-loop';
const majors = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'D♭', 'A♭', 'E♭', 'B♭', 'F'];
const minors = ['Am', 'Em', 'Bm', 'F♯m', 'C♯m', 'G♯m', 'D♯m', 'B♭m', 'Fm', 'Cm', 'Gm', 'Dm'];
export function KeyCircle({ center, en }: { center: Center; en: boolean }) {
  const minor = center.endsWith('m'),
    ring = minor ? minors : majors;
  const i = ring.indexOf(center),
    neighbours = [ring[(i + 11) % 12], ring[(i + 1) % 12]],
    relative = (minor ? majors : minors)[i];
  return (
    <figure className="key-circle">
      <svg aria-hidden="true" viewBox="0 0 300 300">
        {[majors, minors].map((row, level) =>
          row.map((name, j) => {
            const a = (j * Math.PI) / 6,
              r = level ? 88 : 130,
              x = 150 + r * Math.sin(a),
              y = 150 - r * Math.cos(a);
            return (
              <g key={name}>
                {name === center && <circle cx={x} cy={y} r="19" fill="currentColor" />}
                <text
                  x={x}
                  y={y + 5}
                  textAnchor="middle"
                  fill={name === center ? 'Canvas' : 'currentColor'}
                  fontWeight={neighbours.includes(name) || name === relative ? 800 : 500}
                  textDecoration={
                    neighbours.includes(name) || name === relative ? 'underline' : undefined
                  }
                >
                  {name}
                </text>
              </g>
            );
          }),
        )}
      </svg>
      <figcaption>
        {center} · {en ? 'Neighbours' : 'Соседи'}: {neighbours.join(', ')}.{' '}
        {en ? 'Relative key' : 'Параллельная тональность'}: {relative}.
      </figcaption>
    </figure>
  );
}
