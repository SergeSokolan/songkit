import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  BAR_TICKS,
  INSTRUMENTS,
  VELOCITIES,
  gridTicks,
  strengthOf,
  type Pattern,
  type Instrument,
  type Grid,
  type Strength,
} from '../../../entities/drum-pattern';
import { Icon } from '../../../shared/ui/icon';
const names = { kick: 'Бочка', snare: 'Малый', hat: 'Хай-хэт' };
const english = { kick: 'KICK', snare: 'SNARE', hat: 'HI-HAT' };
const strengthNames = { ghost: 'Тихий', normal: 'Обычный', accent: 'Акцент' };
interface Selection {
  instrument: Instrument;
  tick: number;
}
interface Props {
  pattern: Pattern;
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
  bar,
  grid,
  position,
  playing,
  scrollLeft,
  onScroll,
  onHit,
  onMove,
}: Props) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [moving, setMoving] = useState<Selection | null>(null);
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const step = gridTicks(grid);
  const steps = grid;
  const barStart = bar * BAR_TICKS;
  useEffect(() => {
    if (scroll.current) scroll.current.scrollLeft = scrollLeft;
  }, [scrollLeft]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const cancelTimer = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  const activate = (instrument: Instrument, tick: number) => {
    if (moving) {
      if (moving.instrument === instrument) {
        onMove(instrument, moving.tick, tick);
        setMoving(null);
      }
      return;
    }
    const hit = pattern.events.find((e) => e.instrument === instrument && e.tick === tick);
    onHit(instrument, tick, hit ? null : VELOCITIES.normal);
  };
  const pointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    instrument: Instrument,
    tick: number,
    occupied: boolean,
  ) => {
    if (event.button !== 0) return;
    held.current = false;
    dragging.current = false;
    suppressClick.current = false;
    start.current = { x: event.clientX, y: event.clientY, instrument, tick, occupied };
    timer.current = setTimeout(() => {
      held.current = true;
      suppressClick.current = true;
      setSelection({ instrument, tick });
    }, 450);
  };
  const pointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const origin = start.current;
    if (!origin || held.current) return;
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 10) {
      cancelTimer();
      if (origin.occupied && event.pointerType === 'mouse') {
        dragging.current = true;
        suppressClick.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }
  };
  const pointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    cancelTimer();
    if (held.current) {
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-strength]');
      if (target?.dataset.strength && start.current) {
        onHit(
          start.current.instrument,
          start.current.tick,
          VELOCITIES[target.dataset.strength as Strength],
        );
        setSelection(null);
      }
    }
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
      {moving && (
        <div className="inline-notice">
          Выберите новое место на дорожке «{names[moving.instrument]}».{' '}
          <button onClick={() => setMoving(null)}>Отмена</button>
        </div>
      )}
      <div className="sequencer" role="group" aria-label="Барабанная сетка">
        <div className="track-labels">
          <div className="ruler-label">ДОЛИ</div>
          {INSTRUMENTS.map((instrument) => (
            <div className={`track-label ${instrument}`} key={instrument}>
              <Icon name={instrument} size={25} />
              <div>
                <strong>{names[instrument]}</strong>
                <span>{english[instrument]}</span>
              </div>
            </div>
          ))}
        </div>
        <div
          className="grid-scroll"
          ref={scroll}
          onScroll={(e) => onScroll(e.currentTarget.scrollLeft)}
        >
          <div className="grid-content" style={{ minWidth: `${steps * 48}px` }}>
            <div className="beat-ruler" style={{ gridTemplateColumns: `repeat(${steps}, 1fr)` }}>
              {Array.from({ length: steps }, (_, i) => (
                <span className={i % (grid / 4) === 0 ? 'beat-number' : 'subdivision'} key={i}>
                  {i % (grid / 4) === 0 ? i / (grid / 4) + 1 : i % (grid / 8) === 0 ? '&' : '·'}
                </span>
              ))}
            </div>
            {INSTRUMENTS.map((instrument) => (
              <div
                className={`track-row ${instrument}`}
                key={instrument}
                style={{ gridTemplateColumns: `repeat(${steps}, 1fr)` }}
              >
                {Array.from({ length: steps }, (_, i) => {
                  const tick = barStart + i * step;
                  const hit = pattern.events.find(
                    (e) => e.instrument === instrument && e.tick === tick,
                  );
                  const hiddenHits = pattern.events.filter(
                    (e) => e.instrument === instrument && e.tick > tick && e.tick < tick + step,
                  ).length;
                  const active = playing && position >= tick && position < tick + step;
                  const strength = hit ? strengthOf(hit.velocity) : null;
                  return (
                    <button
                      key={tick}
                      type="button"
                      data-cell="true"
                      data-instrument={instrument}
                      data-tick={tick}
                      className={`step ${hit ? 'occupied' : ''} ${strength ?? ''} ${active ? 'playing' : ''} ${i % (grid / 4) === 0 ? 'downbeat' : ''}`}
                      aria-label={`${names[instrument]}, такт ${bar + 1}, шаг ${i + 1}${hit ? `, ${strengthNames[strength!]}` : ', пусто'}${hiddenHits ? ', есть удары между делениями' : ''}`}
                      aria-pressed={!!hit}
                      onPointerDown={(e) => pointerDown(e, instrument, tick, !!hit)}
                      onPointerMove={pointerMove}
                      onPointerUp={pointerUp}
                      onPointerCancel={() => {
                        cancelTimer();
                        start.current = null;
                        suppressClick.current = true;
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setSelection({ instrument, tick });
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
                <h3>{names[selection.instrument]}</h3>
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
            <p className="muted small">На телефоне: удерживайте клетку, чтобы изменить силу.</p>
          </section>
        </div>
      )}
    </>
  );
}
