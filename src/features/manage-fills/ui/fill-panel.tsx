import { useState, type ReactNode } from 'react';
import { INSTRUMENT_DETAILS, type Pattern } from '../../../entities/drum-pattern';
import { genreLabels, instrumentName, useLanguage } from '../../../shared/i18n';
import { catalogFill, FILL_CATALOG } from '../model/catalog';
import type { Fill, FillRange } from '../model/fills';
import { AdvancedFillPanel } from './advanced-fill-panel';
import { fillCopy, fillLabels } from './copy';
interface Props {
  pattern: Pattern;
  bar: number;
  onPreview: (fill: Fill, range: FillRange, allowMissing: boolean) => void;
  onApply: () => void;
  onCancel: () => void;
  previewing: boolean;
  activeId?: string;
  previewDetails?: ReactNode;
}
export function FillPanel(props: Props) {
  const { pattern, bar, onPreview, onApply, onCancel, previewing, activeId, previewDetails } =
    props;
  const language = useLanguage();
  const copy = fillCopy[language];
  const trackLabel = (track: keyof typeof INSTRUMENT_DETAILS) =>
    instrumentName(language, track, INSTRUMENT_DETAILS[track].name);
  const [open, setOpen] = useState(false);
  const [genre, setGenre] = useState('rock');
  const [beats, setBeats] = useState(2);
  const [allowMissing, setAllowMissing] = useState(false);
  return (
    <section className="fills-panel" aria-label={copy.catalog}>
      <button
        className="secondary-button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          onCancel();
        }}
      >
        {copy.openCatalog}
      </button>
      {open && (
        <div className="fills-content">
          <h2>{copy.title(bar + 1)}</h2>
          <p>{copy.intro(beats)}</p>
          <div className="fill-options">
            <label>
              {copy.genre}
              <select
                aria-label={copy.genre}
                value={genre}
                onChange={(e) => {
                  onCancel();
                  setGenre(e.target.value);
                }}
              >
                {Object.entries(genreLabels[language]).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {copy.length}
              <select
                aria-label={copy.length}
                value={beats}
                onChange={(e) => {
                  onCancel();
                  setBeats(Number(e.target.value));
                }}
              >
                {[1, 2, 4].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? '¼' : n === 2 ? '½' : '1'} {copy.barUnit}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <input
              type="checkbox"
              checked={allowMissing}
              onChange={(e) => {
                onCancel();
                setAllowMissing(e.target.checked);
              }}
            />{' '}
            {copy.allowMissing}
          </label>
          <div className="fill-candidates">
            {FILL_CATALOG.filter((c) => c.style === genre && c.beats === beats).map((card) => {
              const { fill, range } = catalogFill(pattern, bar, card.id);
              const missing = range.tracks.filter((t) => !pattern.instruments.includes(t));
              const { name, density } = fillLabels(language, card);
              const scheme = language === 'en' ? card.scheme.replaceAll('Т', 'T') : card.scheme;
              return (
                <article className="pattern-card" key={card.id}>
                  <h3>{name}</h3>
                  <p>
                    {scheme} · {density}
                  </p>
                  <p>{range.tracks.map(trackLabel).join(', ')}</p>
                  {missing.length > 0 && (
                    <p>
                      {copy.missingTracks} {missing.map(trackLabel).join(', ')}
                    </p>
                  )}
                  <button
                    className="secondary-button"
                    disabled={missing.length > 0 && !allowMissing}
                    aria-pressed={activeId === card.id}
                    onClick={() => onPreview(fill, range, allowMissing)}
                  >
                    {activeId === card.id ? copy.stop : copy.listen}: {name}
                  </button>
                  {previewing && activeId === card.id && (
                    <div className="preview-actions">
                      {previewDetails}
                      <button className="secondary-button" onClick={onApply}>
                        {copy.apply}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <p className="small">{copy.notation}</p>
          <AdvancedFillPanel {...props} />
        </div>
      )}
    </section>
  );
}
