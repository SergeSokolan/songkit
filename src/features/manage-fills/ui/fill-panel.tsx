import { useMemo, useState } from 'react';
import {
  PPQ,
  INSTRUMENTS,
  INSTRUMENT_DETAILS,
  totalTicks,
  type Pattern,
  type Instrument,
} from '../../../entities/drum-pattern';
import { FILL_LIBRARY, libraryFill, suggestFills, type Fill, type FillRange } from '../model/fills';
interface Props {
  pattern: Pattern;
  onPreview: (fill: Fill, range: FillRange, allowMissing: boolean) => void;
  onApply: () => void;
  onCancel: () => void;
  previewing: boolean;
  activeId?: string;
}
function boundaryLabel(beat: number) {
  const whole = Math.floor(beat);
  const sub = Math.round((beat - whole) * 8);
  return `Такт ${Math.floor(whole / 4) + 1}, доля ${(whole % 4) + 1}${sub ? ` + ${sub}/8 доли` : ''}`;
}
export function FillPanel({ pattern, onPreview, onApply, onCancel, previewing, activeId }: Props) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(Math.max(0, totalTicks(pattern) / PPQ - 2));
  const [end, setEnd] = useState(totalTicks(pattern) / PPQ);
  const [tracks, setTracks] = useState<Instrument[]>(['snare', 'hat']);
  const [style, setStyle] = useState('rock');
  const [seed, setSeed] = useState(1);
  const [allowMissing, setAllowMissing] = useState(false);
  const range = useMemo(
    () => ({ start: start * PPQ, end: end * PPQ, tracks }),
    [start, end, tracks],
  );
  const valid = start < end && end <= totalTicks(pattern) / PPQ && tracks.length > 0;
  const generated = useMemo(
    () => (valid ? suggestFills(pattern, range, seed, style) : []),
    [pattern, range, seed, style, valid],
  );
  const invalidate = () => onCancel();
  return (
    <section className="fills-panel" aria-label="Брейки">
      <button
        className="secondary-button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          onCancel();
        }}
      >
        Брейки · библиотека и предложения
      </button>
      {open && (
        <div className="fills-content">
          <h2>Брейк внутри фразы</h2>
          <p>Заменяются только выбранные дорожки внутри участка. Остальная партия сохраняется.</p>
          <p className="small">
            Участок: {boundaryLabel(start)} →{' '}
            {end === totalTicks(pattern) / PPQ ? 'конец фразы' : boundaryLabel(end)}. Длина:{' '}
            {Math.max(0, end - start)} доли. Для всех мелких ударов выберите сетку 1/32.
          </p>
          <div className="fill-options">
            <label>
              От доли
              <select
                aria-label="Начало брейка"
                value={start}
                onChange={(e) => {
                  invalidate();
                  setStart(Number(e.target.value));
                }}
              >
                {Array.from({ length: totalTicks(pattern) / 120 }, (_, i) => (
                  <option key={i} value={i / 8}>
                    {boundaryLabel(i / 8)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              До границы
              <select
                aria-label="Конец брейка"
                value={end}
                onChange={(e) => {
                  invalidate();
                  setEnd(Number(e.target.value));
                }}
              >
                {Array.from({ length: totalTicks(pattern) / 120 }, (_, i) => (
                  <option key={i + 1} value={(i + 1) / 8}>
                    {(i + 1) / 8 === totalTicks(pattern) / PPQ
                      ? 'Конец фразы'
                      : boundaryLabel((i + 1) / 8)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Стиль
              <select
                value={style}
                onChange={(e) => {
                  invalidate();
                  setStyle(e.target.value);
                }}
              >
                {['rock', 'pop', 'funk'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <fieldset>
            <legend>Дорожки замены</legend>
            <div className="fill-tracks">
              {INSTRUMENTS.map((t) => (
                <label key={t}>
                  <input
                    type="checkbox"
                    checked={tracks.includes(t)}
                    onChange={() => {
                      invalidate();
                      setTracks(
                        tracks.includes(t) ? tracks.filter((x) => x !== t) : [...tracks, t],
                      );
                    }}
                  />
                  {INSTRUMENT_DETAILS[t].name}
                  {!pattern.instruments.includes(t) ? ' (добавить)' : ''}
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            <input
              type="checkbox"
              checked={allowMissing}
              onChange={(e) => {
                invalidate();
                setAllowMissing(e.target.checked);
              }}
            />{' '}
            Разрешаю добавить недостающие выбранные инструменты при применении
          </label>
          {!valid && <p role="alert">Выберите конец после начала и хотя бы одну дорожку.</p>}
          <h3>Под мой бит</h3>
          <div className="fill-candidates">
            {generated.map((f) => (
              <button
                className="secondary-button"
                key={f.id}
                aria-pressed={activeId === f.id}
                onClick={() => onPreview(f, range, false)}
              >
                {f.name} · {f.density}
              </button>
            ))}
            <button
              className="secondary-button"
              disabled={!valid}
              onClick={() => {
                invalidate();
                setSeed(seed + 1);
              }}
            >
              Другие варианты
            </button>
          </div>
          {valid && generated.length < 3 && (
            <p>Для этого участка и дорожек доступно меньше трёх различных вариантов.</p>
          )}
          <h3>Библиотека · {style}</h3>
          <div className="fill-candidates">
            {FILL_LIBRARY.filter((f) => f.style === style).map((t) => {
              const fill = valid ? libraryFill(pattern, range, t.id) : null;
              const missing = fill?.events.some((e) => !pattern.instruments.includes(e.instrument));
              return (
                <button
                  className="secondary-button"
                  key={t.id}
                  aria-pressed={activeId === t.id}
                  disabled={!fill?.events.length || (!!missing && !allowMissing)}
                  onClick={() => fill && onPreview(fill, range, allowMissing)}
                >
                  {t.name} · {t.density}
                </button>
              );
            })}
          </div>
          <p className="small">
            Оригинальные шаблоны SongKit, CC0. Длительность подстраивается к участку без изменения
            размера.
          </p>
          {previewing && (
            <div className="inline-notice" role="status">
              Предпросмотр: нажмите «Играть». При воспроизведении вариант вступит со следующего
              начала участка. Экспорт и сохранение используют подтверждённую партию.
              <div className="fill-candidates">
                <button className="secondary-button" onClick={onApply}>
                  Применить брейк
                </button>
                <button className="secondary-button" onClick={onCancel}>
                  Отменить предпросмотр
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
