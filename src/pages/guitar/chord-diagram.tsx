import { voicing, type Chord, type Form } from '../../entities/guitar-loop';
export function ChordDiagram({ chord, form }: { chord: Chord; form: Form }) {
  const { frets, fingers, start } = voicing(chord, form);
  const nut = 74,
    space = 30,
    left = 44,
    right = 194;
  return (
    <svg className="chord-chart" viewBox="0 0 238 232" aria-hidden="true">
      <g fill="currentColor" textAnchor="middle" fontFamily="system-ui,sans-serif">
        <text x="119" y="28" fontSize="25" fontWeight="700">
          {chord}
        </text>
        {[1, 2, 3, 4].map((fret) => (
          <g key={fret + start - 1}>
            <line
              x1={left}
              x2={right}
              y1={nut + space * fret}
              y2={nut + space * fret}
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <text x="22" y={nut + (fret - 0.5) * space + 5} fontSize="13">
              {fret + start - 1}
            </text>
          </g>
        ))}
        <line
          x1={left - 1}
          x2={right + 1}
          y1={nut}
          y2={nut}
          stroke="currentColor"
          strokeWidth={start === 1 ? 6 : 1.5}
        />
        {['1', '3'].map((finger) => {
          const indices = [...fingers].flatMap((v, i) => (v === finger && frets[i] > 0 ? [i] : []));
          if (indices.length < 2) return null;
          const first = indices[0],
            last = indices[indices.length - 1];
          const y = nut + (frets[first] - start + 0.5) * space;
          return (
            <line
              key={finger}
              x1={left + first * space}
              x2={left + last * space}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeWidth="11"
              strokeLinecap="round"
            />
          );
        })}
        {frets.map((value, i) => {
          const x = left + space * i;
          const cy = nut + (value - start + 0.5) * space;
          return (
            <g key={i}>
              <line
                x1={x}
                x2={x}
                y1={nut}
                y2={nut + 4 * space}
                stroke="currentColor"
                strokeWidth={2.3 - i * 0.22}
              />
              <text x={x} y="216" fontSize="14">
                {6 - i}
              </text>
              {value === 0 ? (
                <circle cx={x} cy="54" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
              ) : value < 0 ? (
                <path
                  d={`M${x - 5} 49l10 10m0 -10l-10 10`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              ) : (
                <>
                  <circle cx={x} cy={cy} r="12" />
                  <text x={x} y={cy + 5} fill="white" fontSize="15" fontWeight="700">
                    {fingers[i]}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
