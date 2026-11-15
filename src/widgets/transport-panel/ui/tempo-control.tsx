import { MIN_TEMPO as MIN, MAX_TEMPO as MAX } from '../../../entities/drum-pattern';
import { useEffect, useRef, useState } from 'react';
interface Props {
  tempo: number;
  onTempo: (tempo: number) => void;
}
const ROW = 48;
const TEMPO_ERROR = `Введите целое число (${MIN}–${MAX} BPM).`;

function parseTempo(value: string): number | null {
  const text = value.trim();
  const tempo = Number(text);
  return /^\d+$/.test(text) && tempo >= MIN && tempo <= MAX ? tempo : null;
}

export function TempoControl({ tempo, onTempo }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(tempo);
  const [mainText, setMainText] = useState<string | null>(null);
  const [mainInvalid, setMainInvalid] = useState(false);
  const [pickerText, setPickerText] = useState<string | null>(null);
  const [pickerInvalid, setPickerInvalid] = useState(false);
  const mainInput = useRef<HTMLInputElement>(null);
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
  const commitTempo = (next: number) => {
    if (next !== latest.current.tempo) {
      latest.current.onTempo(next);
      latest.current = { ...latest.current, tempo: next };
    }
  };
  const finishMainInput = () => {
    if (mainText === null) return;
    const next = parseTempo(mainText);
    setMainText(null);
    setMainInvalid(next === null);
    if (next !== null) commitTempo(next);
  };
  const step = (direction: number) => {
    setMainInvalid(false);
    commitTempo(Math.max(MIN, Math.min(MAX, latest.current.tempo + direction)));
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
  const setWheelDraft = (value: number) => {
    setDraft(value);
    setPickerText(null);
    setPickerInvalid(false);
  };
  const select = (value: number) => {
    const next = Math.max(MIN, Math.min(MAX, value));
    setWheelDraft(next);
    wheel.current?.scrollTo({ top: (next - MIN) * ROW });
  };
  const confirm = () => {
    const next = pickerText === null ? draft : parseTempo(pickerText);
    if (next === null) {
      setPickerInvalid(true);
      return;
    }
    commitTempo(next);
    setMainInvalid(false);
    setOpen(false);
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
              mainInput.current?.blur();
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
            ref={mainInput}
            aria-label="Темп BPM"
            aria-describedby={mainInvalid ? 'tempo-input-status' : undefined}
            inputMode="numeric"
            enterKeyHint="done"
            value={mainText ?? String(tempo)}
            onChange={(e) => {
              setMainText(e.target.value);
              setMainInvalid(false);
            }}
            onBlur={finishMainInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur();
            }}
          />
          <button
            className="tempo-picker-open"
            aria-label="Выбрать темп барабаном"
            onClick={() => {
              setWheelDraft(latest.current.tempo);
              setOpen(true);
            }}
          >
            BPM ▾
          </button>
        </div>
      </div>
      {mainInvalid && (
        <div id="tempo-input-status" className="small" role="status">
          {TEMPO_ERROR}
        </div>
      )}
      <input
        aria-label="Скорость"
        type="range"
        min={MIN}
        max={MAX}
        value={tempo}
        onChange={(e) => {
          setMainInvalid(false);
          commitTempo(Number(e.target.value));
        }}
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
            onScroll={(e) => {
              const next = Math.max(
                MIN,
                Math.min(MAX, MIN + Math.round(e.currentTarget.scrollTop / ROW)),
              );
              if (next !== draft) setWheelDraft(next);
            }}
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
              aria-invalid={pickerInvalid || undefined}
              aria-describedby={pickerInvalid ? 'tempo-picker-error' : undefined}
              inputMode="numeric"
              enterKeyHint="done"
              value={pickerText ?? String(draft)}
              onChange={(e) => {
                setPickerText(e.target.value);
                setPickerInvalid(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) confirm();
              }}
            />
          </label>
          {pickerInvalid && (
            <p id="tempo-picker-error" role="alert">
              {TEMPO_ERROR}
            </p>
          )}
          <div className="fill-candidates">
            <button className="secondary-button" onClick={() => setOpen(false)}>
              Отмена
            </button>
            <button className="secondary-button" onClick={confirm}>
              Готово
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
