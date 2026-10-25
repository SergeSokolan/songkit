import { MIN_TEMPO as MIN, MAX_TEMPO as MAX } from '../../../entities/drum-pattern';
import { useEffect, useRef, useState } from 'react';
interface Props {
  tempo: number;
  onTempo: (tempo: number) => void;
}
const ROW = 48;
export function TempoControl({ tempo, onTempo }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(tempo);
  const dialog = useRef<HTMLDialogElement>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ tempo, onTempo });
  useEffect(() => {
    latest.current = { tempo, onTempo };
  }, [tempo, onTempo]);
  const stop = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => {
    const hide = () => {
      stop();
      if (document.hidden) setOpen(false);
    };
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', hide);
    return () => {
      stop();
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      wheel.current?.scrollTo({ top: (latest.current.tempo - MIN) * ROW });
    } else dialog.current?.close();
  }, [open]);
  const step = (direction: number) => {
    const next = Math.max(MIN, Math.min(MAX, latest.current.tempo + direction));
    if (next !== latest.current.tempo) {
      latest.current.onTempo(next);
      latest.current = { ...latest.current, tempo: next };
    }
  };
  const hold = (direction: number) => {
    stop();
    step(direction);
    const repeat = () => {
      step(direction);
      timer.current = setTimeout(repeat, 100);
    };
    timer.current = setTimeout(repeat, 450);
  };
  const select = (value: number) => {
    const next = Math.max(MIN, Math.min(MAX, value));
    setDraft(next);
    wheel.current?.scrollTo({ top: (next - MIN) * ROW });
  };
  return (
    <div className="tempo-control">
      <span className="eyebrow">ТЕМП</span>
      <div className="tempo-stepper">
        {([-1, 1] as const).map((direction) => (
          <button
            key={direction}
            className={`tempo-step ${direction < 0 ? 'minus' : 'plus'}`}
            aria-label={direction < 0 ? 'Уменьшить темп' : 'Увеличить темп'}
            disabled={direction < 0 ? tempo === MIN : tempo === MAX}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              hold(direction);
            }}
            onPointerUp={stop}
            onPointerCancel={stop}
            onLostPointerCapture={stop}
            onClick={(e) => {
              if (e.detail === 0) step(direction);
            }}
          >
            {direction < 0 ? '−' : '+'}
          </button>
        ))}
        <div className="tempo-value">
          <input
            aria-label="Темп BPM"
            type="number"
            min={MIN}
            max={MAX}
            value={tempo}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= MIN && n <= MAX) onTempo(n);
            }}
          />
          <button
            className="tempo-picker-open"
            aria-label="Выбрать темп барабаном"
            onClick={() => {
              setDraft(tempo);
              setOpen(true);
            }}
          >
            BPM ▾
          </button>
        </div>
      </div>
      <input
        aria-label="Скорость"
        type="range"
        min={MIN}
        max={MAX}
        value={tempo}
        onChange={(e) => onTempo(Number(e.target.value))}
      />
      <dialog
        ref={dialog}
        className="tempo-dialog"
        aria-labelledby="tempo-title"
        onCancel={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="tempo-sheet">
          <h2 id="tempo-title">Темп · {draft} BPM</h2>
          <p>Прокрутите барабан или введите значение.</p>
          <div
            className="tempo-wheel"
            ref={wheel}
            role="listbox"
            tabIndex={0}
            aria-label="Барабан темпа BPM"
            aria-activedescendant={`bpm-${draft}`}
            onScroll={(e) =>
              setDraft(
                Math.max(MIN, Math.min(MAX, MIN + Math.round(e.currentTarget.scrollTop / ROW))),
              )
            }
            onKeyDown={(e) => {
              if (['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                e.preventDefault();
                select(
                  e.key === 'Home'
                    ? MIN
                    : e.key === 'End'
                      ? MAX
                      : draft +
                        ({ ArrowUp: -1, ArrowDown: 1, PageUp: -10, PageDown: 10 }[e.key] ?? 0),
                );
              }
            }}
          >
            {Array.from({ length: MAX - MIN + 1 }, (_, i) => (
              <div
                id={`bpm-${i + MIN}`}
                role="option"
                aria-selected={draft === i + MIN}
                className={draft === i + MIN ? 'selected' : ''}
                key={i}
                onClick={() => select(i + MIN)}
              >
                {i + MIN}
              </div>
            ))}
          </div>
          <label>
            Точное значение
            <input
              aria-label="Новое значение BPM"
              type="number"
              min={MIN}
              max={MAX}
              value={draft}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isInteger(n) && n >= MIN && n <= MAX) select(n);
              }}
            />
          </label>
          <div className="fill-candidates">
            <button className="secondary-button" onClick={() => setOpen(false)}>
              Отмена
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                onTempo(draft);
                setOpen(false);
              }}
            >
              Готово
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
