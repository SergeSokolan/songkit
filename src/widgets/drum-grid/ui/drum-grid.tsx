import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  BAR_TICKS,
  INSTRUMENT_DETAILS,
  displayInstruments,
  eventId,
  type DrumEvent,
  VELOCITIES,
  gridTicks,
  gridSteps,
  strengthOf,
  type Pattern,
  type Instrument,
  type Grid,
} from '../../../entities/drum-pattern';
import { Icon } from '../../../shared/ui/icon';
const strengthNames = { ghost: 'Тихий', normal: 'Обычный', accent: 'Акцент' };
interface Selection {
  instrument: Instrument;
  tick: number;
}
interface Props {
  pattern: Pattern;
  fillRange?: { start: number; end: number; tracks: Instrument[] };
  bar: number;
  grid: Grid;
  position: number;
  playing: boolean;
  scrollLeft: number;
  onScroll: (value: number) => void;
  onHit: (instrument: Instrument, tick: number, velocity: number | null) => void;
  onMove: (instrument: Instrument, from: number, to: number) => void;
}
export function DrumGrid({
  pattern,
  fillRange,
  bar,
  grid,
  position,
  playing,
  scrollLeft,
  onScroll,
  onHit,
  onMove,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [moving, setMoving] = useState<Selection | null>(null);
  const start = useRef<{
    x: number;
    y: number;
    instrument: Instrument;
    tick: number;
    occupied: boolean;
  } | null>(null);
  const dragging = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const instruments = displayInstruments(pattern);
  const step = gridTicks(grid);
  const steps = gridSteps(grid);
  const barStart = bar * BAR_TICKS;
  // Build once per edit, not once per cell on every playhead update.
  const cells = useMemo(() => {
    const hits = new Map<string, DrumEvent>();
    const hidden = new Map<string, number>();
    for (const event of pattern.events) {
      if (event.tick < barStart || event.tick >= barStart + BAR_TICKS) continue;
      const offset = event.tick - barStart;
      if (offset % step === 0) hits.set(eventId(event.instrument, event.tick), event);
      else {
        const key = eventId(event.instrument, barStart + Math.floor(offset / step) * step);
        hidden.set(key, (hidden.get(key) ?? 0) + 1);
      }
    }
    return { hits, hidden };
  }, [pattern.events, barStart, step]);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollLeft = scrollLeft;
  }, [scrollLeft]);
  const activate = (instrument: Instrument, tick: number) => {
    if (editing) {
      setSelection({ instrument, tick });
      setEditing(false);
      return;
    }
    if (moving) {
      if (moving.instrument === instrument) {
        onMove(instrument, moving.tick, tick);
        setMoving(null);
      }
      return;
    }
    const hit = pattern.events.find((e) => e.instrument === instrument && e.tick === tick);
    onHit(
      instrument,
      tick,
      !hit || strengthOf(hit.velocity) === 'accent'
        ? VELOCITIES.normal
        : strengthOf(hit.velocity) === 'normal'
          ? VELOCITIES.ghost
          : null,
    );
  };
  const pointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    instrument: Instrument,
    tick: number,
    occupied: boolean,
  ) => {
    if (event.button !== 0) return;
    dragging.current = false;
    suppressClick.current = false;
    start.current = { x: event.clientX, y: event.clientY, instrument, tick, occupied };
  };
  const pointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const origin = start.current;
    if (!origin) return;
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 10) {
      suppressClick.current = true;
      if (origin.occupied && event.pointerType === 'mouse') {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }
  };
  const pointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragging.current && start.current) {
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-cell]');
      if (target?.dataset.instrument === start.current.instrument && target.dataset.tick)
        onMove(start.current.instrument, start.current.tick, Number(target.dataset.tick));
    }
    start.current = null;
    dragging.current = false;
  };
  const currentHit = selection
    ? pattern.events.find((e) => e.instrument === selection.instrument && e.tick === selection.tick)
    : null;
  return (
    <>
      <button
        className="text-button"
        aria-pressed={editing}
        onClick={() => {
          setEditing(!editing);
          setMoving(null);
        }}
      >
        Изменить / перенести удар
      </button>
      {editing && <p role="status">Выберите клетку для изменения или переноса удара.</p>}
      {moving && (
        <div className="inline-notice">
          Выберите новое место на дорожке «{INSTRUMENT_DETAILS[moving.instrument].name}».{' '}
          <button onClick={() => setMoving(null)}>Отмена</button>
        </div>
      )}
      <div className="sequencer" role="group" aria-label="Барабанная сетка">
        <div className="track-labels">
          <div className="ruler-label">ДОЛИ</div>
          {instruments.map((instrument) => (
            <div className={`track-label ${instrument}`} key={instrument}>
              <Icon name={INSTRUMENT_DETAILS[instrument].icon} size={25} />
              <div>
                <strong
                  aria-label={INSTRUMENT_DETAILS[instrument].name}
                  data-short={
                    instrument.startsWith('tom')
                      ? 'Т' + instrument.slice(3)
                      : INSTRUMENT_DETAILS[instrument].name
                  }
                >
                  {INSTRUMENT_DETAILS[instrument].name}
                </strong>
                <span>{INSTRUMENT_DETAILS[instrument].label}</span>
              </div>
            </div>
          ))}
        </div>
        <div
          className="grid-scroll"
          ref={scroll}
          onScroll={(e) => onScroll(e.currentTarget.scrollLeft)}
        >
          <div className="grid-content" style={{ minWidth: `${steps * 50}px` }}>
            <div className="beat-ruler" style={{ gridTemplateColumns: `repeat(${steps}, 1fr)` }}>
              {Array.from({ length: steps }, (_, i) => (
                <span className={i % (steps / 4) === 0 ? 'beat-number' : 'subdivision'} key={i}>
                  {i % (steps / 4) === 0 ? i / (steps / 4) + 1 : i % (steps / 8) === 0 ? '&' : '·'}
                </span>
              ))}
            </div>
            {instruments.map((instrument) => (
              <div className="track-block" key={instrument}>
                <div className={`mobile-track-name ${instrument}`}>
                  {INSTRUMENT_DETAILS[instrument].name}
                </div>
                <div
                  className={`track-row ${instrument}`}
                  style={{ gridTemplateColumns: `repeat(${steps}, 1fr)` }}
                >
                  {Array.from({ length: steps }, (_, i) => {
                    const tick = barStart + i * step;
                    const key = eventId(instrument, tick);
                    const hit = cells.hits.get(key);
                    const hiddenHits = cells.hidden.get(key) ?? 0;
                    const active = playing && position >= tick && position < tick + step;
                    const strength = hit ? strengthOf(hit.velocity) : null;
                    return (
                      <button
                        key={tick}
                        type="button"
                        data-cell="true"
                        data-instrument={instrument}
                        data-tick={tick}
                        className={`step ${fillRange && tick >= fillRange.start && tick < fillRange.end && fillRange.tracks.includes(instrument) ? 'fill-selected' : ''} ${hit ? 'occupied' : ''} ${strength ?? ''} ${active ? 'playing' : ''} ${i % (steps / 4) === 0 ? 'downbeat' : ''}`}
                        aria-label={`${INSTRUMENT_DETAILS[instrument].name}, такт ${bar + 1}, шаг ${i + 1}${hit ? `, ${strengthNames[strength!]}` : ', пусто'}${hiddenHits ? ', есть удары между делениями' : ''}`}
                        aria-pressed={!!hit}
                        onPointerDown={(e) => pointerDown(e, instrument, tick, !!hit)}
                        onPointerMove={pointerMove}
                        onPointerUp={pointerUp}
                        onPointerCancel={() => {
                          start.current = null;
                          suppressClick.current = true;
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                        }}
                        onClick={() => {
                          if (suppressClick.current) {
                            suppressClick.current = false;
                            return;
                          }
                          activate(instrument, tick);
                        }}
                      >
                        {hit ? (
                          <span className="hit-dot">{strength === 'accent' ? '›' : ''}</span>
                        ) : (
                          <span className="empty-dot" />
                        )}
                        {hiddenHits > 0 && (
                          <span className="hidden-hits" title="Удары между делениями">
                            {hiddenHits}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {selection && (
        <div className="sheet-backdrop" onClick={() => setSelection(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Сила удара"
            className="strength-sheet"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSelection(null);
            }}
          >
            <div className="sheet-heading">
              <div>
                <span className="eyebrow">СИЛА УДАРА</span>
                <h3>{INSTRUMENT_DETAILS[selection.instrument].name}</h3>
              </div>
              <button
                autoFocus
                className="icon-button"
                aria-label="Закрыть"
                onClick={() => setSelection(null)}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="strength-options">
              {(['ghost', 'normal', 'accent'] as const).map((strength) => (
                <button
                  key={strength}
                  aria-label={`${strengthNames[strength]}, сила ${VELOCITIES[strength]}`}
                  data-strength={strength}
                  className={`strength-choice ${strength} ${currentHit && strengthOf(currentHit.velocity) === strength ? 'chosen' : ''}`}
                  onClick={() => {
                    onHit(selection.instrument, selection.tick, VELOCITIES[strength]);
                    setSelection(null);
                  }}
                >
                  <span className="hit-dot">{strength === 'accent' ? '›' : ''}</span>
                  <strong>{strengthNames[strength]}</strong>
                  <small>{VELOCITIES[strength]}</small>
                </button>
              ))}
            </div>
            {currentHit && (
              <div className="sheet-actions">
                <button
                  className="text-button"
                  onClick={() => {
                    setMoving(selection);
                    setSelection(null);
                  }}
                >
                  Перенести удар
                </button>
                <button
                  className="text-button danger"
                  onClick={() => {
                    onHit(selection.instrument, selection.tick, null);
                    setSelection(null);
                  }}
                >
                  Удалить
                </button>
              </div>
            )}
            <p className="muted small">
              Выберите клетку для редактирования. Для переноса нажмите «Перенести удар», затем новое
              место.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
