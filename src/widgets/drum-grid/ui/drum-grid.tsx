import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
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
import { instrumentName, useLanguage } from '../../../shared/i18n';
import { Icon } from '../../../shared/ui/icon';

const copy = {
  ru: {
    edit: 'Изменить / перенести удар',
    selectCell: 'Выберите клетку для изменения или переноса удара.',
    selectDestination: (name: string) => `Выберите новое место на дорожке «${name}».`,
    cancel: 'Отмена',
    grid: 'Барабанная сетка',
    beats: 'ДОЛИ',
    bar: 'такт',
    step: 'шаг',
    empty: 'пусто',
    offGrid: 'есть удары между делениями',
    offGridTitle: 'Удары между делениями',
    strength: 'Сила удара',
    strengthHeading: 'СИЛА УДАРА',
    strengthNames: { ghost: 'Тихий', normal: 'Обычный', accent: 'Акцент' },
    velocity: 'сила',
    close: 'Закрыть',
    move: 'Перенести удар',
    remove: 'Удалить',
    editHelp:
      'Выберите клетку для редактирования. Для переноса нажмите «Перенести удар», затем новое место.',
  },
  en: {
    edit: 'Edit / move hit',
    selectCell: 'Choose a cell to edit or move a hit.',
    selectDestination: (name: string) => `Choose a new position on the ${name} track.`,
    cancel: 'Cancel',
    grid: 'Drum grid',
    beats: 'BEATS',
    bar: 'bar',
    step: 'step',
    empty: 'empty',
    offGrid: 'there are hits between steps',
    offGridTitle: 'Hits between steps',
    strength: 'Hit strength',
    strengthHeading: 'HIT STRENGTH',
    strengthNames: { ghost: 'Ghost', normal: 'Normal', accent: 'Accent' },
    velocity: 'velocity',
    close: 'Close',
    move: 'Move hit',
    remove: 'Delete',
    editHelp: 'Choose a cell to edit. To move the hit, select “Move hit” and then a new position.',
  },
};
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
  const language = useLanguage();
  const t = copy[language];
  const tracks = displayInstruments(pattern).map((instrument) => ({
    instrument,
    name: instrumentName(language, instrument, INSTRUMENT_DETAILS[instrument].name),
  }));
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
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const originCell = useRef<HTMLButtonElement>(null);
  const suppressClick = useRef(false);
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
  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollLeft = scrollLeft;
  }, [bar, fillRange, grid, scrollLeft]);
  useLayoutEffect(() => {
    if (!fillRange || !scroll.current) return;
    const viewport = scroll.current;
    const firstCell = viewport.querySelector('.fill-selected');
    if (firstCell)
      viewport.scrollLeft +=
        firstCell.getBoundingClientRect().left - viewport.getBoundingClientRect().left;
  }, [bar, fillRange, grid]);
  useLayoutEffect(() => {
    if (selection) {
      dialog.current?.showModal();
      closeButton.current?.focus();
    }
  }, [selection]);
  const closeSelection = () => {
    dialog.current?.close();
    setSelection(null);
    originCell.current?.focus();
  };
  const activate = (cell: HTMLButtonElement, instrument: Instrument, tick: number) => {
    if (editing) {
      originCell.current = cell;
      setSelection({ instrument, tick });
      setEditing(false);
      return;
    }
    if (moving) {
      if (moving.instrument === instrument) {
        onMove(instrument, moving.tick, tick);
        setMoving(null);
        cell.focus();
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
        {t.edit}
      </button>
      {editing && <p role="status">{t.selectCell}</p>}
      {moving && (
        <div className="inline-notice">
          {t.selectDestination(
            instrumentName(language, moving.instrument, INSTRUMENT_DETAILS[moving.instrument].name),
          )}{' '}
          <button
            onClick={() => {
              setMoving(null);
              originCell.current?.focus();
            }}
          >
            {t.cancel}
          </button>
        </div>
      )}
      <div className="sequencer" role="group" aria-label={t.grid}>
        <div className="track-labels">
          <div className="ruler-label">{t.beats}</div>
          {tracks.map(({ instrument, name }) => (
            <div className={`track-label ${instrument}`} key={instrument}>
              <Icon name={INSTRUMENT_DETAILS[instrument].icon} size={25} />
              <div>
                <strong
                  aria-label={name}
                  data-short={
                    instrument.startsWith('tom')
                      ? (language === 'ru' ? 'Т' : 'T') + instrument.slice(3)
                      : name
                  }
                >
                  {name}
                </strong>
                {language === 'ru' && <span>{INSTRUMENT_DETAILS[instrument].label}</span>}
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
            {tracks.map(({ instrument, name }) => (
              <div className="track-block" key={instrument}>
                <div className={`mobile-track-name ${instrument}`}>{name}</div>
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
                        aria-label={`${name}, ${t.bar} ${bar + 1}, ${t.step} ${i + 1}, ${strength ? t.strengthNames[strength] : t.empty}${hiddenHits ? `, ${t.offGrid}` : ''}`}
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
                        onClick={(e) => {
                          if (suppressClick.current) {
                            suppressClick.current = false;
                            return;
                          }
                          activate(e.currentTarget, instrument, tick);
                        }}
                      >
                        {hit ? (
                          <span className="hit-dot">{strength === 'accent' ? '›' : ''}</span>
                        ) : (
                          <span className="empty-dot" />
                        )}
                        {hiddenHits > 0 && (
                          <span className="hidden-hits" title={t.offGridTitle}>
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
        <dialog
          ref={dialog}
          aria-label={t.strength}
          className="sheet-backdrop"
          onCancel={(e) => {
            e.preventDefault();
            closeSelection();
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSelection();
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Tab') return;
            const buttons = Array.from(
              e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
            );
            const first = buttons[0];
            const last = buttons.at(-1);
            if (e.shiftKey ? e.target === first : e.target === last) {
              e.preventDefault();
              (e.shiftKey ? last : first)?.focus();
            }
          }}
        >
          <section className="strength-sheet">
            <div className="sheet-heading">
              <div>
                <span className="eyebrow">{t.strengthHeading}</span>
                <h3>
                  {instrumentName(
                    language,
                    selection.instrument,
                    INSTRUMENT_DETAILS[selection.instrument].name,
                  )}
                </h3>
              </div>
              <button
                ref={closeButton}
                className="icon-button"
                aria-label={t.close}
                onClick={closeSelection}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="strength-options">
              {(['ghost', 'normal', 'accent'] as const).map((strength) => (
                <button
                  key={strength}
                  aria-label={`${t.strengthNames[strength]}, ${t.velocity} ${VELOCITIES[strength]}`}
                  data-strength={strength}
                  className={`strength-choice ${strength} ${currentHit && strengthOf(currentHit.velocity) === strength ? 'chosen' : ''}`}
                  onClick={() => {
                    onHit(selection.instrument, selection.tick, VELOCITIES[strength]);
                    closeSelection();
                  }}
                >
                  <span className="hit-dot">{strength === 'accent' ? '›' : ''}</span>
                  <strong>{t.strengthNames[strength]}</strong>
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
                    closeSelection();
                  }}
                >
                  {t.move}
                </button>
                <button
                  className="text-button danger"
                  onClick={() => {
                    onHit(selection.instrument, selection.tick, null);
                    closeSelection();
                  }}
                >
                  {t.remove}
                </button>
              </div>
            )}
            <p className="muted small">{t.editHelp}</p>
          </section>
        </dialog>
      )}
    </>
  );
}
