import { useState } from 'react';
import { INSTRUMENT_DETAILS, type Pattern } from '../../../entities/drum-pattern';
import { GROOVE_CATALOG, grooveCandidate } from '../model/grooves';
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
}
const genres = { rock: 'Рок', metal: 'Металл', pop: 'Поп', funk: 'Фанк', jazz: 'Джаз' };
export function GroovePanel({ pattern, bar, onPreview, onApply, onCancel, activeId }: Props) {
  const [open, setOpen] = useState(false),
    [genre, setGenre] = useState('rock'),
    [all, setAll] = useState(false),
    [allow, setAllow] = useState(false);
  return (
    <section className="fills-panel" aria-label="Базовые ритмы">
      <button
        className="secondary-button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          onCancel();
        }}
      >
        Базовые ритмы
      </button>
      {open && (
        <div className="fills-content">
          <h2>Основа партии</h2>
          <label>
            Жанр ритма
            <select
              aria-label="Жанр ритма"
              value={genre}
              onChange={(e) => {
                onCancel();
                setGenre(e.target.value);
              }}
            >
              {Object.entries(genres).map(([id, name]) => (
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
            Повторить во всех тактах
          </label>
          <p>
            Заменяются дорожки карточки: {all ? 'все такты' : 'такт ' + (bar + 1)}. Темп
            сохраняется.
          </p>
          <label>
            <input
              type="checkbox"
              checked={allow}
              onChange={(e) => {
                onCancel();
                setAllow(e.target.checked);
              }}
            />{' '}
            Добавить недостающие инструменты
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
              return (
                <article className="pattern-card" key={card.id}>
                  <h3>{card.name}</h3>
                  <p>{card.description}</p>
                  <p>
                    {card.feel} · {card.density}
                  </p>
                  <p>Дорожки: {range.tracks.map((t) => INSTRUMENT_DETAILS[t].name).join(', ')}</p>
                  {missing.length > 0 && (
                    <p>Добавьте: {missing.map((t) => INSTRUMENT_DETAILS[t].name).join(', ')}</p>
                  )}
                  <button
                    className="secondary-button"
                    disabled={missing.length > 0 && !allow}
                    aria-pressed={activeId === card.id}
                    onClick={() => onPreview(fill, range, allow)}
                  >
                    Прослушать: {card.name}
                  </button>
                </article>
              );
            })}
          </div>
          {activeId && GROOVE_CATALOG.some((c) => c.id === activeId) && (
            <div className="inline-notice" role="status">
              Предпросмотр: нажмите «Играть». Исходная партия сохранена до применения.
              <button className="secondary-button" onClick={onApply}>
                Применить ритм
              </button>
              <button className="secondary-button" onClick={onCancel}>
                Отменить предпросмотр
              </button>
            </div>
          )}
          <p className="small">
            Оригинальные учебные адаптации. Обратный свинг — согласованный вариант короткая/длинная,
            не общепринятый стандарт джаза. Райд и остальные инструменты имеют отдельные позиции;
            вся партия автоматически не свингуется.
          </p>
        </div>
      )}
    </section>
  );
}
