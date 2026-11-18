import { useMemo, useState, type ReactNode } from 'react';
import {
  PPQ,
  INSTRUMENTS,
  INSTRUMENT_DETAILS,
  totalTicks,
  type Pattern,
  type Instrument,
} from '../../../entities/drum-pattern';
import { genreLabels, instrumentName, useLanguage } from '../../../shared/i18n';
import { FILL_LIBRARY, libraryFill, suggestFills, type Fill, type FillRange } from '../model/fills';
import { fillCopy, fillLabels } from './copy';
interface Props {
  pattern: Pattern;
  onPreview: (fill: Fill, range: FillRange, allowMissing: boolean) => void;
  onApply: () => void;
  onCancel: () => void;
  previewing: boolean;
  activeId?: string;
  previewDetails?: ReactNode;
}
const styles = ['rock', 'pop', 'funk'] as const;
export function AdvancedFillPanel({
  pattern,
  onPreview,
  onApply,
  onCancel,
  previewing,
  activeId,
  previewDetails,
}: Props) {
  const language = useLanguage();
  const copy = fillCopy[language];
  const styleLabel = (s: (typeof styles)[number]) =>
    language === 'ru' ? s : genreLabels[language][s];
  const boundaryLabel = (beat: number) => {
    const whole = Math.floor(beat);
    const sub = Math.round((beat - whole) * 8);
    return copy.boundary(Math.floor(whole / 4) + 1, (whole % 4) + 1, sub);
  };
  const candidateLabel = (candidate: Pick<Fill, 'name' | 'density'>) => {
    const { name, density } = fillLabels(language, candidate);
    return `${name} · ${density}`;
  };
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(Math.max(0, totalTicks(pattern) / PPQ - 2));
  const [end, setEnd] = useState(totalTicks(pattern) / PPQ);
  const [tracks, setTracks] = useState<Instrument[]>(['snare', 'hat']);
  const [style, setStyle] = useState<(typeof styles)[number]>('rock');
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
    <section className="fills-panel" aria-label={copy.advanced}>
      <button
        className="secondary-button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          onCancel();
        }}
      >
        {copy.openAdvanced}
      </button>
      {open && (
        <div className="fills-content">
          <h2>{copy.advancedTitle}</h2>
          <p>{copy.advancedIntro}</p>
          <p className="small">
            {copy.range(
              boundaryLabel(start),
              end === totalTicks(pattern) / PPQ ? copy.endOfPhrase : boundaryLabel(end),
              Math.max(0, end - start),
            )}
          </p>
          <div className="fill-options">
            <label>
              {copy.start}
              <select
                aria-label={copy.startLabel}
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
              {copy.end}
              <select
                aria-label={copy.endLabel}
                value={end}
                onChange={(e) => {
                  invalidate();
                  setEnd(Number(e.target.value));
                }}
              >
                {Array.from({ length: totalTicks(pattern) / 120 }, (_, i) => (
                  <option key={i + 1} value={(i + 1) / 8}>
                    {(i + 1) / 8 === totalTicks(pattern) / PPQ
                      ? copy.endOption
                      : boundaryLabel((i + 1) / 8)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {copy.style}
              <select
                value={style}
                onChange={(e) => {
                  invalidate();
                  setStyle(styles[e.target.selectedIndex]);
                }}
              >
                {styles.map((s) => (
                  <option key={s} value={s}>
                    {styleLabel(s)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset>
            <legend>{copy.tracks}</legend>
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
                  {instrumentName(language, t, INSTRUMENT_DETAILS[t].name)}
                  {!pattern.instruments.includes(t) ? copy.add : ''}
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
            {copy.allowSelected}
          </label>
          {!valid && <p role="alert">{copy.invalidRange}</p>}
          <h3>{copy.generated}</h3>
          <div className="fill-candidates">
            {generated.map((f) => (
              <button
                className="secondary-button"
                key={f.id}
                aria-pressed={activeId === f.id}
                onClick={() => onPreview(f, range, false)}
              >
                {activeId === f.id ? copy.stop : copy.listen}: {candidateLabel(f)}
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
              {copy.regenerate}
            </button>
          </div>
          {valid && generated.length < 3 && <p>{copy.fewerVariants}</p>}
          <h3>
            {copy.library} · {styleLabel(style)}
          </h3>
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
                  {activeId === t.id ? copy.stop : copy.listen}: {candidateLabel(t)}
                </button>
              );
            })}
          </div>
          <p className="small">{copy.attribution}</p>
          {previewing &&
            activeId &&
            (generated.some((fill) => fill.id === activeId) ||
              FILL_LIBRARY.some((fill) => fill.id === activeId)) && (
              <div className="preview-actions">
                {previewDetails}
                <button className="secondary-button" onClick={onApply}>
                  {copy.apply}
                </button>
              </div>
            )}
        </div>
      )}
    </section>
  );
}
