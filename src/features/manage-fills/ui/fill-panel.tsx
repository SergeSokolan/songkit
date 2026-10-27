import { useState } from 'react';
import { INSTRUMENT_DETAILS, type Pattern } from '../../../entities/drum-pattern';
import { catalogFill, FILL_CATALOG, GENRES } from '../model/catalog';
import type { Fill, FillRange } from '../model/fills';
import { AdvancedFillPanel } from './advanced-fill-panel';
interface Props {
  pattern: Pattern;
  bar: number;
  onPreview: (fill: Fill, range: FillRange, allowMissing: boolean) => void;
  onApply: () => void;
  onCancel: () => void;
  previewing: boolean;
  activeId?: string;
}
export function FillPanel(props: Props) {
  const { pattern, bar, onPreview, onApply, onCancel, previewing, activeId } = props;
  const [open, setOpen] = useState(false);
  const [genre, setGenre] = useState('rock');
  const [beats, setBeats] = useState(2);
  const [allowMissing, setAllowMissing] = useState(false);
  return (
    <section className="fills-panel" aria-label="Каталог брейков">
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
          <h2>Брейк · такт {bar + 1}</h2>
          <p>
            Последние {beats} {beats === 1 ? 'доля' : 'доли'} выбранного такта. Каждая карточка —
            законченная фраза в 4/4.
          </p>
          <div className="fill-options">
            <label>
              Жанр брейка
              <select
                aria-label="Жанр брейка"
                value={genre}
                onChange={(e) => {
                  onCancel();
                  setGenre(e.target.value);
                }}
              >
                {Object.entries(GENRES).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Длительность брейка
              <select
                aria-label="Длительность брейка"
                value={beats}
                onChange={(e) => {
                  onCancel();
                  setBeats(Number(e.target.value));
                }}
              >
                {[1, 2, 4].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? '¼' : n === 2 ? '½' : '1'} такт
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
            Добавить недостающие дорожки при применении
          </label>
          <div className="fill-candidates">
            {FILL_CATALOG.filter((c) => c.style === genre && c.beats === beats).map((card) => {
              const { fill, range } = catalogFill(pattern, bar, card.id);
              const missing = range.tracks.filter((t) => !pattern.instruments.includes(t));
              return (
                <article className="pattern-card" key={card.id}>
                  <h3>{card.name}</h3>
                  <p>
                    {card.scheme} · {card.density}
                  </p>
                  <p>{range.tracks.map((t) => INSTRUMENT_DETAILS[t].name).join(', ')}</p>
                  {missing.length > 0 && (
                    <p>
                      Нужны дорожки: {missing.map((t) => INSTRUMENT_DETAILS[t].name).join(', ')}
                    </p>
                  )}
                  <button
                    className="secondary-button"
                    disabled={missing.length > 0 && !allowMissing}
                    aria-pressed={activeId === card.id}
                    onClick={() => onPreview(fill, range, allowMissing)}
                  >
                    Прослушать: {card.name}
                  </button>
                </article>
              );
            })}
          </div>
          <p className="small">
            Учебные адаптации SongKit, CC0. S — малый, H — хэт, K — бочка, R/L — руки; скобки —
            тихий удар. Прослушивание: выберите карточку, затем «Играть».
          </p>
          {previewing && activeId && FILL_CATALOG.some((c) => c.id === activeId) && (
            <div className="inline-notice" role="status">
              Предпросмотр не сохраняется. Заменяются перечисленные дорожки в конце такта {bar + 1};
              остальная партия сохраняется.
              <button className="secondary-button" onClick={onApply}>
                Применить брейк
              </button>
              <button className="secondary-button" onClick={onCancel}>
                Отменить предпросмотр
              </button>
            </div>
          )}
          <AdvancedFillPanel {...props} />
        </div>
      )}
    </section>
  );
}
