import { KeyCircle } from './key-circle';
import { RiffEditor } from './riff-editor';
import { ChordDiagram } from './chord-diagram';
import { useEffect, useRef, useState } from 'react';
import {
  chords,
  relations,
  chordName,
  spellChord,
  inKey,
  isOpen,
  pitches,
  defaultRiff,
  openForm,
  chordForms,
  voicing,
  type Form,
  type Center,
  type Chord,
  type Loop,
} from '../../entities/guitar-loop';
import { loadLoop, saveLoop } from '../../features/guitar-draft';
import { useLanguage } from '../../shared/i18n';
import './style.css';

const defaultTempo = 120;
export function Guitar() {
  const en = useLanguage() === 'en';
  const t = (ru: string, eng: string) => (en ? eng : ru);
  const [loop, setLoop] = useState<Loop | null>(null),
    [ready, setReady] = useState(false),
    [index, select] = useState(0),
    [candidate, preview] = useState<Chord | null>(null),
    [previewForm, setPreviewForm] = useState<Form>('A'),
    [playing, play] = useState(false),
    [repeating, setRepeating] = useState(false),
    [problem, error] = useState(''),
    [failed, fail] = useState(false),
    [replace, setReplace] = useState(false);
  const [riffMode, setRiffMode] = useState(false),
    [activeBeat, setActiveBeat] = useState(-1);
  const history = useRef<(Loop | null)[]>([]),
    audio = useRef<AudioContext | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    revision = useRef(0);
  function stopAudio() {
    clearTimeout(timer.current);
    const ctx = audio.current;
    audio.current = null;
    if (ctx) void ctx.close().catch(() => {});
  }
  function stop() {
    stopAudio();
    play(false);
    setActiveBeat(-1);
  }
  useEffect(() => {
    let mounted = true;
    loadLoop().then(
      (v) => {
        if (mounted) {
          setLoop(v ?? { version: 1, center: 'Am', bars: ['Am'], bpm: defaultTempo });
          setReady(true);
        }
      },
      () => {
        if (mounted) fail(true);
      },
    );
    const hide = () => {
      if (document.hidden) {
        stopAudio();
        play(false);
        setActiveBeat(-1);
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      mounted = false;
      stopAudio();
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);
  function persist(v: Loop | null) {
    const id = ++revision.current;
    error('');
    void saveLoop(v).catch(() => {
      if (revision.current === id) error('save');
    });
  }
  function change(v: Loop | null, at: number, remember = true) {
    stop();
    if (remember) history.current.push(loop);
    setLoop(v);
    select(at);
    preview(null);
    setReplace(false);
    persist(v);
  }
  async function listen(bars: Chord[], repeat: boolean, forms?: Form[], riff?: number[]) {
    stop();
    error((old) => (old === 'audio' ? '' : old));
    let ctx: AudioContext | undefined;
    try {
      ctx = new AudioContext();
      audio.current = ctx;
      await ctx.resume();
      if (audio.current !== ctx) return;
      const active = ctx;
      const duration = 240 / (loop?.bpm ?? defaultTempo);
      let step = 0;
      function tone(note: number, at: number, volume: number, length: number) {
        const osc = active.createOscillator(),
          gain = active.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 440 * 2 ** ((note - 69) / 12);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
        osc.connect(gain).connect(active.destination);
        osc.start(at);
        osc.stop(at + length + 0.01);
      }
      if (riff) {
        const frets = voicing(bars[0], forms?.[0]).frets,
          beat = duration / 4;
        const origin = active.currentTime + 0.03;
        let k = repeat ? -4 : 0;
        function tick() {
          if (audio.current !== active) return;
          const at = origin + (k + (repeat ? 4 : 0)) * beat,
            slot = k % 4;
          if (k < 0) {
            setActiveBeat(-1);
            tone(82, at, 0.1, 0.06);
          } else {
            setActiveBeat(slot);
            const string = riff![slot];
            if (slot === 0 && repeat)
              pitches(bars[0], forms?.[0]).forEach((note) => tone(note, at, 0.025, 0.65));
            if (string >= 0)
              tone([40, 45, 50, 55, 59, 64][string] + frets[string], at, 0.18, beat * 0.9);
          }
          k++;
          timer.current = setTimeout(
            k === 4 && !repeat ? stop : tick,
            Math.max(0, (at + beat - active.currentTime - 0.015) * 1000),
          );
        }
        play(true);
        setRepeating(false);
        tick();
        return;
      }
      function bar() {
        if (audio.current !== active) return;
        const i = step % bars.length;
        if (repeat) select(i);
        pitches(bars[i], forms?.[i]).forEach((note, string) =>
          tone(note, active.currentTime + string * 0.015, 0.095, 1.3),
        );
        step++;
        timer.current = setTimeout(repeat || step < bars.length ? bar : stop, duration * 1000);
      }
      setRepeating(repeat);
      play(true);
      bar();
    } catch {
      if (!ctx || audio.current === ctx) {
        stop();
        error('audio');
      }
    }
  }
  const chord = candidate ?? loop?.bars[index];
  const forms = loop?.forms ?? loop?.bars.map(openForm) ?? [];
  const form = candidate ? previewForm : forms[index];
  const grip = chord ? voicing(chord, form) : null;
  const riffs = loop?.riffs ?? loop?.bars.map(() => null) ?? [];
  const resetRiff = (i: number) =>
    !riffs[i] ||
    window.confirm(
      t('Заменить свой рифф новым образцом?', 'Replace your edited riff with a new pattern?'),
    );
  const source = loop?.bars[index] ?? 'Am';
  const labels = loop?.labels ?? loop?.bars ?? [];
  const sourceName = labels[index] ?? source;
  const nameOf = (c: Chord) => spellChord(source, sourceName, c);
  const currentName = candidate ? nameOf(candidate) : sourceName;
  const relatives = relations(source);
  const options = [relatives.relative, ...relatives.neighbours, ...relatives.related];
  return (
    <main className="guitar">
      <h1>{t('Гитара', 'Guitar')}</h1>
      {failed ? (
        <p role="alert">
          {t('Не удалось прочитать черновик.', 'Could not read draft.')}{' '}
          <button
            onClick={() => {
              if (window.confirm(t('Сбросить гитарный черновик?', 'Reset guitar draft?'))) {
                fail(false);
                setReady(true);
                change(null, 0, false);
              }
            }}
          >
            {t('Сбросить', 'Reset')}
          </button>
        </p>
      ) : !ready ? (
        <p>{t('Открываем…', 'Opening…')}</p>
      ) : !loop ? (
        <>
          <h2>{t('Какой аккорд поставим первым?', 'Choose your first chord')}</h2>
          <div className="choices">
            {chords.map((c) => (
              <button
                key={c}
                onClick={() => change({ version: 1, center: c, bars: [c], bpm: defaultTempo }, 0)}
              >
                {c} · {chordName(c, en)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p>
            {loop.bars.length === 1 ? (
              <label>
                {t('Тональность партии', 'Loop key')}{' '}
                <select
                  value={loop.center}
                  onChange={(event) => {
                    const center = event.target.value as Center;
                    if (!resetRiff(0)) return;
                    change(
                      {
                        ...loop,
                        riffs: undefined,
                        labels: undefined,
                        center,
                        bars: [center],
                        forms: [openForm(center)],
                      },
                      0,
                    );
                  }}
                >
                  {chords.map((c) => (
                    <option key={c} value={c}>
                      {c} · {chordName(c, en) + (!en && !c.endsWith('m') ? ' мажор' : '')}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                {t('Тональность партии', 'Loop key')} ·{' '}
                <strong>
                  {loop.center} ·{' '}
                  {chordName(loop.center, en) + (!en && !loop.center.endsWith('m') ? ' мажор' : '')}
                </strong>
              </>
            )}
          </p>
          <div className="choices">
            {loop.bars.map((_, i) => (
              <button
                key={i}
                aria-pressed={i === index}
                onClick={() => {
                  stop();
                  select(i);
                  preview(null);
                  setReplace(false);
                }}
              >
                {i + 1} · {labels[i]}
              </button>
            ))}
          </div>
          <div className="choices">
            <button
              onClick={() => {
                if (playing) stop();
                else {
                  preview(null);
                  void listen(loop.bars, true, forms);
                }
              }}
            >
              {playing ? t('Стоп', 'Stop') : t('Играть партию', 'Play loop')}
            </button>
            <label>
              {t('Темп', 'Tempo')}{' '}
              <select
                value={loop.bpm}
                onChange={(e) => change({ ...loop, bpm: Number(e.target.value) }, index)}
              >
                {Array.from({ length: 141 }, (_, i) => (
                  <option key={i}>{40 + i}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="choices">
            {[false, true].map((mode) => (
              <button
                key={String(mode)}
                aria-pressed={riffMode === mode}
                onClick={() => {
                  stop();
                  preview(null);
                  setRiffMode(mode);
                  setReplace(false);
                }}
              >
                {mode ? t('Рифф', 'Riff') : t('Аккорды', 'Chords')}
              </button>
            ))}
          </div>
          {riffMode && grip && (
            <RiffEditor
              frets={grip.frets}
              steps={riffs[index] ?? defaultRiff(grip.frets)}
              en={en}
              playing={playing}
              active={activeBeat}
              onEdit={(r) =>
                change({ ...loop, riffs: riffs.map((old, i) => (i === index ? r : old)) }, index)
              }
              onPlay={(repeat) => {
                if (playing) stop();
                else
                  void listen(
                    [loop.bars[index]],
                    repeat,
                    [forms[index]],
                    riffs[index] ?? defaultRiff(grip.frets),
                  );
              }}
            />
          )}
          {!riffMode && (
            <>
              {playing && repeating && !candidate && (
                <p>
                  {t('Дальше', 'Next')} · {labels[(index + 1) % loop.bars.length]}
                </p>
              )}
              {(loop.bars.length < 4 || replace) && (
                <>
                  <h2>
                    {t('Подбор от', 'Suggestions from')} {sourceName}
                  </h2>
                  <div className="choices">
                    {options.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          preview(c);
                          setPreviewForm(openForm(c));
                          void listen([source, c], false, [forms[index], openForm(c)]);
                        }}
                      >
                        ▷ {nameOf(c)}
                        {!inKey(loop.center, c) && (
                          <small className="outside-key">
                            {' '}
                            {t('Вне гаммы', 'Outside scale')} {loop.center}
                          </small>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <details>
                <summary>
                  {t('Связи на круге', 'Circle relationships')} · {sourceName}
                </summary>
                <KeyCircle center={source} sourceName={sourceName} en={en} />
              </details>

              {loop.center === 'Am' && !candidate && !replace && (
                <details>
                  <summary>{t('Вернуться в Am через E', 'Return to Am via E')}</summary>
                  <p>
                    {t(
                      'В гармоническом ля миноре соль повышается до соль-диеза. Сыграйте E, затем Am.',
                      'In A harmonic minor, G rises to G sharp. Play E, then Am.',
                    )}
                  </p>
                  <div className="choices">
                    <button onClick={() => void listen(['E', 'Am'], false)}>
                      {t('Послушать E → Am', 'Hear E → Am')}
                    </button>
                    {loop.bars.length <= 2 ? (
                      <button
                        onClick={() => {
                          const at = index + 1;
                          const bars = [...loop.bars],
                            nextForms = [...forms],
                            nextRiffs = [...riffs],
                            nextLabels = [...labels];
                          bars.splice(at, 0, 'E', 'Am');
                          nextForms.splice(at, 0, 'E', 'A');
                          nextRiffs.splice(at, 0, null, null);
                          nextLabels.splice(at, 0, 'E', 'Am');
                          change(
                            {
                              ...loop,
                              bars,
                              forms: nextForms,
                              riffs: nextRiffs,
                              labels: nextLabels,
                            },
                            at,
                          );
                        }}
                      >
                        {t('Добавить E → Am', 'Add E → Am')}
                      </button>
                    ) : (
                      <span>
                        {t(
                          'Для вставки нужны два свободных такта.',
                          'Inserting this pair needs two free bars.',
                        )}
                      </span>
                    )}
                  </div>
                </details>
              )}
              {candidate && (
                <div className="choices">
                  <button
                    onClick={() => {
                      const bars = [...loop.bars];
                      const at = replace ? index : index + 1;
                      if (replace && !resetRiff(at)) return;
                      const nextLabels = [...labels];
                      nextLabels.splice(at, replace ? 1 : 0, currentName);
                      const nextRiffs = [...riffs];
                      nextRiffs.splice(at, replace ? 1 : 0, null);
                      bars.splice(at, replace ? 1 : 0, candidate);
                      const nextForms = [...forms];
                      nextForms.splice(at, replace ? 1 : 0, previewForm);
                      change(
                        { ...loop, bars, forms: nextForms, riffs: nextRiffs, labels: nextLabels },
                        at,
                      );
                    }}
                  >
                    {replace ? t('Заменить на', 'Replace with') : t('Добавить', 'Add')}{' '}
                    {currentName}
                  </button>
                  <button
                    onClick={() => {
                      stop();
                      preview(null);
                      setReplace(false);
                    }}
                  >
                    {t('Отмена', 'Cancel')}
                  </button>
                </div>
              )}
              {chord && grip && (
                <section>
                  <h2>
                    {candidate ? t('Вариант', 'Preview') : t('Такт', 'Bar') + ' ' + (index + 1)} ·{' '}
                    {currentName} · {chordName(currentName, en)}
                  </h2>
                  <div className="choices">
                    <label>
                      {t('Постановка', 'Voicing')}{' '}
                      <select
                        value={form}
                        onChange={(e) => {
                          const next = e.target.value as Form;
                          if (!candidate && !resetRiff(index)) return;
                          if (candidate) setPreviewForm(next);
                          else
                            change(
                              {
                                ...loop,
                                riffs: riffs.map((r, i) => (i === index ? null : r)),
                                forms: forms.map((f, i) => (i === index ? next : f)),
                              },
                              index,
                            );
                          void listen([chord], false, [next]);
                        }}
                      >
                        {chordForms(chord).map((f) => (
                          <option key={f} value={f}>
                            {isOpen(chord, f)
                              ? t('Открытая', 'Open')
                              : t('Форма ', 'Shape ') +
                                f +
                                ' · ' +
                                t('лад ', 'fret ') +
                                voicing(chord, f).start}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <details className="voicing-tip">
                    <summary>{t('Как выбрать форму?', 'Which shape should I use?')}</summary>
                    <p>
                      {isOpen(chord, form)
                        ? t(
                            `Начните с открытого ${currentName}. Если переход к следующему аккорду удобен, эту постановку можно оставить на всю партию.`,
                            `Start with open ${currentName}. If the next chord is easy to reach, you can use this shape throughout the loop.`,
                          )
                        : t(
                            `Вы играете ${currentName}. Буква ${form} подсказывает знакомую постановку, от которой взята схема. Здесь она начинается с лада ${grip.start}.`,
                            `You are playing ${currentName}. The letter ${form} names the familiar shape this grip comes from. Here it starts at fret ${grip.start}.`,
                          )}
                    </p>
                    <p>
                      {t(
                        `Попробуйте две постановки ${currentName} по очереди. Аккорд тот же, а звук и положение руки меняются. Выберите ту, из которой легче перейти к следующему такту.`,
                        `Try two shapes of ${currentName} in turn. The chord stays the same while its sound and your hand position change. Pick the one that makes the next bar easier to reach.`,
                      )}
                    </p>
                  </details>
                  <ChordDiagram chord={chord} form={form} label={currentName} />
                  <ul className="chord-description">
                    {grip.frets.map((v, i) => (
                      <li key={i}>
                        {6 - i} ·{' '}
                        {v < 0
                          ? t('пропустить', 'skip')
                          : v === 0
                            ? t('открытая', 'open')
                            : t('лад', 'fret') +
                              ' ' +
                              v +
                              ' · ' +
                              (en
                                ? ['', 'index', 'middle', 'ring', 'little']
                                : ['', 'указательный', 'средний', 'безымянный', 'мизинец'])[
                                Number(grip.fingers[i])
                              ]}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {!candidate && (
                <div className="choices">
                  <button
                    onClick={() => {
                      stop();
                      setReplace(!replace);
                    }}
                  >
                    {t('Заменить такт', 'Replace bar')}
                  </button>
                  <button
                    onClick={() => {
                      const bars = loop.bars.filter((_, i) => i !== index);
                      change(
                        bars.length
                          ? {
                              ...loop,
                              bars,
                              riffs: riffs.filter((_, i) => i !== index),
                              labels: labels.filter((_, i) => i !== index),
                              forms: forms.filter((_, i) => i !== index),
                            }
                          : null,
                        Math.max(0, index - 1),
                      );
                    }}
                  >
                    {t('Удалить такт', 'Remove bar')}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
      {history.current.length > 0 && (
        <button onClick={() => change(history.current.pop() ?? null, 0, false)}>
          {t('Отменить правку', 'Undo edit')}
        </button>
      )}
      {ready && (
        <aside className="guitar-help" aria-label={t('Подсказки', 'Tips')}>
          <details>
            <summary>
              {t(
                'Как выбрать следующий аккорд? · Квинтовый круг тональностей',
                'How do I choose the next chord? · Circle of fifths',
              )}
            </summary>

            <p>
              {t(
                'Подбор начинается с выбранного такта. Ля минор и до мажор — параллельные тональности с одинаковыми знаками при ключе. После Am попробуйте аккорд C.',
                'Suggestions start from the selected bar. A minor and C major are relative keys with the same key signature. Try C after Am.',
              )}
            </p>
            <p>
              {t(
                'Сыграйте Am → Dm → Am. Теперь замените Dm на Em и послушайте, какое возвращение к Am вам больше нравится.',
                'Play Am → Dm → Am. Now try Em in place of Dm and listen to which return to Am you prefer.',
              )}
            </p>
          </details>
          <details>
            <summary>
              {t(
                'Как сыграть аккорд выше на грифе? · CAGED',
                'How do I play a chord higher up the neck? · CAGED',
              )}
            </summary>
            <p>
              {t(
                'CAGED связывает пять знакомых форм: C, A, G, E и D. Один и тот же аккорд можно найти в нескольких местах грифа. Буква формы подсказывает, как расположены пальцы.',
                'CAGED connects five familiar shapes: C, A, G, E and D. You can find the same chord in several places on the neck. The shape name describes the fingering pattern.',
              )}
            </p>
            <p>
              {t(
                'Возьмите открытый C и сыграйте только три тонкие струны. Теперь прижмите те же три струны на V ладу и сыграйте их вместе. Это часть формы A. Оба раза звучит до мажор, второй раз — выше.',
                'Play an open C using just the three thinnest strings. Now press those same strings at fret 5 and play them together. This is part of the A shape. Both are C major; the second sounds higher.',
              )}
            </p>
          </details>
        </aside>
      )}
      {problem && (
        <p role="alert">
          {problem === 'save'
            ? t('Не удалось сохранить.', 'Save failed.')
            : t('Звук недоступен.', 'Audio unavailable.')}{' '}
          {problem === 'save' && (
            <button onClick={() => persist(loop)}>{t('Повторить', 'Retry')}</button>
          )}
        </p>
      )}
    </main>
  );
}
