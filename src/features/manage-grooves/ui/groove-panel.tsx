import { useState, type ReactNode } from 'react';
import { INSTRUMENT_DETAILS, type Pattern } from '../../../entities/drum-pattern';
import { genreLabels, instrumentName, useLanguage } from '../../../shared/i18n';
import { GROOVE_CATALOG, grooveCandidate } from '../model/grooves';
import { grooveCopy, grooveLabels } from './copy';
interface Props {
  pattern: Pattern;
  bar: number;
  onPreview: (
    fill: ReturnType<typeof grooveCandidate>['fill'],
    range: ReturnType<typeof grooveCandidate>['range'],
    allowMissing: boolean,
  ) => void;
  onApply: () => void;
  onCancel: () => void;
  activeId?: string;
  previewDetails?: ReactNode;
}
export function GroovePanel({
  pattern,
  bar,
  onPreview,
  onApply,
  onCancel,
  activeId,
  previewDetails,
}: Props) {
  const language = useLanguage();
  const copy = grooveCopy[language];
  const trackLabel = (track: keyof typeof INSTRUMENT_DETAILS) =>
    instrumentName(language, track, INSTRUMENT_DETAILS[track].name);
  const [open, setOpen] = useState(false),
    [genre, setGenre] = useState('rock'),
    [all, setAll] = useState(false),
    [allow, setAllow] = useState(false);
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
        {copy.catalog}
      </button>
      {open && (
        <div className="fills-content">
          <h2>{copy.title}</h2>
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
            <input
              type="checkbox"
              checked={all}
              onChange={(e) => {
                onCancel();
                setAll(e.target.checked);
              }}
            />{' '}
            {copy.repeat}
          </label>
          <p>{copy.range(bar + 1, all)}</p>
          <label>
            <input
              type="checkbox"
              checked={allow}
              onChange={(e) => {
                onCancel();
                setAllow(e.target.checked);
              }}
            />{' '}
            {copy.allowMissing}
          </label>
          <div className="fill-candidates">
            {GROOVE_CATALOG.filter((c) => c.style === genre).map((card) => {
              const { fill, range } = grooveCandidate(
                pattern,
                all ? 0 : bar,
                all ? pattern.barCount - 1 : bar,
                card.id,
              );
              const missing = range.tracks.filter((t) => !pattern.instruments.includes(t));
              const { name, description, feel, density } = grooveLabels(language, card);
              return (
                <article className="pattern-card" key={card.id}>
                  <h3>{name}</h3>
                  <p>{description}</p>
                  <p>
                    {feel} · {density}
                  </p>
                  <p>
                    {copy.tracks} {range.tracks.map(trackLabel).join(', ')}
                  </p>
                  {missing.length > 0 && (
                    <p>
                      {copy.missingTracks} {missing.map(trackLabel).join(', ')}
                    </p>
                  )}
                  <button
                    className="secondary-button"
                    disabled={missing.length > 0 && !allow}
                    aria-pressed={activeId === card.id}
                    onClick={() => onPreview(fill, range, allow)}
                  >
                    {activeId === card.id ? copy.stop : copy.listen}: {name}
                  </button>
                  {activeId === card.id && (
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
          <p className="small">{copy.attribution}</p>
        </div>
      )}
    </section>
  );
}
