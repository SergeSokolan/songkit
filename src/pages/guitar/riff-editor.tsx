export function RiffEditor({
  frets,
  steps,
  onEdit,
  onPlay,
  playing,
  active,
  en,
}: {
  frets: number[];
  steps: number[];
  onEdit: (r: number[]) => void;
  onPlay: (repeat: boolean) => void;
  playing: boolean;
  active: number;
  en: boolean;
}) {
  return (
    <section>
      <h2>{en ? 'Riff' : 'Рифф'}</h2>
      <table className="riff-tab">
        <caption>{en ? 'Tablature' : 'Табулатура'}</caption>
        <thead>
          <tr>
            <th>{en ? 'Beat' : 'Доля'}</th>
            {steps.map((_, i) => (
              <th key={i} aria-current={active === i ? 'step' : undefined}>
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[5, 4, 3, 2, 1, 0].map((s) => (
            <tr key={s}>
              <th>{['E', 'A', 'D', 'G', 'B', 'e'][s]}</th>
              {steps.map((note, i) => (
                <td key={i}>{note === s ? frets[s] : '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="choices">
        {steps.map((n, i) => (
          <label key={i}>
            {en ? 'Beat' : 'Доля'} {i + 1}{' '}
            <select
              value={n}
              onChange={(e) =>
                onEdit(steps.map((old, j) => (j === i ? Number(e.target.value) : old)))
              }
            >
              <option value={-1}>{en ? 'Rest' : 'Пауза'}</option>
              {frets.map((f, s) =>
                f < 0 ? null : (
                  <option key={s} value={s}>
                    {en ? 'String' : 'Струна'} {6 - s} · {en ? 'fret' : 'лад'} {f}
                  </option>
                ),
              )}
            </select>
          </label>
        ))}
      </div>
      <div className="choices">
        <button onClick={() => onPlay(false)}>
          {playing ? (en ? 'Stop' : 'Стоп') : en ? 'Listen to riff' : 'Послушать рифф'}
        </button>
        {!playing && (
          <button onClick={() => onPlay(true)}>{en ? 'Play with me' : 'Сыграть со мной'}</button>
        )}
      </div>
    </section>
  );
}
