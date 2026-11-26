import { KeyCircle } from './key-circle';
import { RiffEditor, RiffTab } from './riff-editor';
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
import { GuitarAudio } from '../../features/playback';
import { loadLoop, saveLoop } from '../../features/guitar-draft';
import { DraftConflict } from '../../shared/lib/draft-store';
import { useLanguage } from '../../shared/i18n';
import './style.css';

const defaultTempo = 120;
const undoLimit = 100;
type AudioRequest = [bars: Chord[], repeat: boolean, forms?: Form[], riff?: number[]];
export function Guitar() {
  const en = useLanguage() === 'en';
  const t = (ru: string, eng: string) => (en ? eng : ru);
  const [loop, setLoop] = useState<Loop | null>(null),
    [ready, setReady] = useState(false),
    [index, select] = useState(0),
    [candidate, preview] = useState<Chord | null>(null),
    [pendingForm, setPendingForm] = useState<Form | null>(null),
    [previewForm, setPreviewForm] = useState<Form>('A'),
    [transport, setTransport] = useState<'loop' | 'riff' | 'preview' | null>(null),
    [audioFailed, setAudioFailed] = useState(false),
    [problem, error] = useState(''),
    [failed, fail] = useState(false),
    [replace, setReplace] = useState(false);
  const [riffMode, setRiffMode] = useState(false),
    [activeBeat, setActiveBeat] = useState(-1);
  const [conflicted, setConflicted] = useState(false);
  const history = useRef<(Loop | null)[]>([]),
    audio = useRef(new GuitarAudio()),
    retryAudio = useRef<AudioRequest | null>(null),
    generation = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    revision = useRef(0);
  function stopAudio() {
    clearTimeout(timer.current);
    generation.current++;
    audio.current.stop();
  }
  function stop() {
    retryAudio.current = null;
    setAudioFailed(false);
    stopAudio();
    setTransport(null);
    setActiveBeat(-1);
  }
  useEffect(() => {
    let mounted = true;
    const engine = audio.current;
    loadLoop().then(
      ({ loop: v, conflict }) => {
        if (mounted) {
          setConflicted(conflict);
          setLoop(
            v ?? (conflict ? null : { version: 1, center: 'Am', bars: ['Am'], bpm: defaultTempo }),
          );
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
        engine.dispose();
        setTransport(null);
        setActiveBeat(-1);
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      mounted = false;
      stopAudio();
      engine.dispose();
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);
  function persist(v: Loop | null) {
    const id = ++revision.current;
    error('');
    void saveLoop(v).then(
      () => {
        if (revision.current === id) setConflicted(false);
      },
      (cause) => {
        if (revision.current !== id) return;
        if (cause instanceof DraftConflict) setConflicted(true);
        else error('save');
      },
    );
  }
  function change(v: Loop | null, at: number, remember = true) {
    stop();
    if (remember) {
      history.current.push(loop);
      if (history.current.length > undoLimit) history.current.shift();
    }
    setLoop(v);
    select(at);
    setPendingForm(null);
    preview(null);
    setReplace(false);
    persist(v);
  }
  async function listen(bars: Chord[], repeat: boolean, forms?: Form[], riff?: number[]) {
    stop();
    const id = generation.current;
    const fail = () => {
      if (generation.current !== id) return;
      stopAudio();
      audio.current.dispose();
      setTransport(null);
      setActiveBeat(-1);
      retryAudio.current = [bars, repeat, forms, riff];
      setAudioFailed(true);
    };
    setTransport(riff ? 'riff' : repeat ? 'loop' : 'preview');
    try {
      const route = await audio.current.prepare(fail);
      if (!route || generation.current !== id) return;
      const { context: active, output } = route;
      const duration = 240 / (loop?.bpm ?? defaultTempo);
      const origin = active.currentTime + 0.03;
      const schedule = (at: number, next: () => void) => {
        timer.current = setTimeout(next, Math.max(0, (at - active.currentTime - 0.015) * 1000));
      };
      function missed(at: number) {
        if (at >= active.currentTime - 0.15) return false;
        stop();
        return true;
      }
      let step = 0;
      function tone(note: number, at: number, volume: number, length: number) {
        const osc = active.createOscillator(),
          gain = active.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 440 * 2 ** ((note - 69) / 12);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
        osc.connect(gain).connect(output);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
        osc.start(at);
        osc.stop(at + length + 0.01);
      }
      if (riff) {
        const frets = voicing(bars[0], forms?.[0]).frets,
          beat = duration / 4;

        let k = repeat ? -4 : 0;
        function tick() {
          if (generation.current !== id) return;
          const at = origin + (k + (repeat ? 4 : 0)) * beat,
            slot = k % 4;
          if (missed(at)) return;
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
          schedule(at + beat, k === 4 && !repeat ? stop : tick);
        }

        tick();
        return;
      }
      function bar() {
        if (generation.current !== id) return;
        const at = origin + step * duration;
        if (missed(at)) return;
        const i = step % bars.length;
        if (repeat) select(i);
        pitches(bars[i], forms?.[i]).forEach((note, string) =>
          tone(note, at + string * 0.015, 0.095, 1.3),
        );
        step++;
        schedule(origin + step * duration, repeat || step < bars.length ? bar : stop);
      }

      bar();
    } catch {
      fail();
    }
  }
  const chord = candidate ?? loop?.bars[index];
  const forms = loop?.forms ?? loop?.bars.map(openForm) ?? [];
  const form = candidate ? previewForm : (pendingForm ?? forms[index]);
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
                  setPendingForm(null);
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
                if (transport === 'loop') stop();
                else {
                  setPendingForm(null);
                  preview(null);
                  void listen(loop.bars, true, forms);
                }
              }}
            >
              {transport === 'loop' ? t('Стоп', 'Stop') : t('Играть партию', 'Play loop')}
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
          {audioFailed && (
            <p role="alert">
              {t(
                'Не удалось включить звук. Проверьте громкость медиа и повторите.',
                'Could not start audio. Check media volume and retry.',
              )}{' '}
              <button
                onClick={() => {
                  const request = retryAudio.current;
                  if (request) void listen(...request);
                }}
              >
                {t('Попробовать включить звук', 'Try enabling audio')}
              </button>
            </p>
          )}
          <div className="choices">
            {[false, true].map((mode) => (
              <button
                key={String(mode)}
                aria-pressed={riffMode === mode}
                onClick={() => {
                  stop();
                  setPendingForm(null);
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
              playing={transport === 'riff'}
              active={activeBeat}
              onEdit={(r) =>
                change({ ...loop, riffs: riffs.map((old, i) => (i === index ? r : old)) }, index)
              }
              onPlay={(repeat) => {
                if (transport === 'riff') stop();
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
              {transport === 'loop' && !candidate && (
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
                          setPendingForm(null);
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
                      setPendingForm(null);
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
                          if (candidate) setPreviewForm(next);
                          else setPendingForm(next === forms[index] ? null : next);
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
                  {pendingForm && !candidate && (
                    <>
                      <RiffTab
                        frets={grip.frets}
                        steps={defaultRiff(grip.frets)}
                        active={activeBeat}
                        en={en}
                        caption={t('Образец риффа', 'Riff sample')}
                      />
                      <div className="choices">
                        <button
                          onClick={() =>
                            void listen([chord], false, [pendingForm], defaultRiff(grip.frets))
                          }
                        >
                          {t('Послушать образец риффа', 'Hear riff sample')}
                        </button>
                        <button
                          onClick={() => {
                            if (!resetRiff(index)) return;
                            change(
                              {
                                ...loop,
                                forms: forms.map((f, i) => (i === index ? pendingForm : f)),
                                riffs: riffs.map((r, i) => (i === index ? null : r)),
                              },
                              index,
                            );
                          }}
                        >
                          {t('Применить постановку', 'Apply voicing')}
                        </button>
                        <button
                          onClick={() => {
                            stop();
                            setPendingForm(null);
                          }}
                        >
                          {t('Отмена', 'Cancel')}
                        </button>
                      </div>
                    </>
                  )}
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
                      setPendingForm(null);
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
                'Возьмите открытый C. Теперь сыграйте C в форме A: поставьте пальцы по второй схеме. Сравните звучание этих двух постановок.',
                'Play open C, then try C using the A shape in the second diagram. Compare the sound of the two voicings.',
              )}
            </p>
            <div className="caged-examples">
              {(['C', 'A'] as const).map((exampleForm) => (
                <figure key={exampleForm}>
                  <figcaption>
                    {exampleForm === 'C'
                      ? t('Открытый C', 'Open C')
                      : t('C в форме A', 'C in the A shape')}
                  </figcaption>
                  <ChordDiagram chord="C" form={exampleForm} label="C" />
                  <p className="chord-description">
                    {voicing('C', exampleForm)
                      .frets.map((f) => (f < 0 ? '×' : f))
                      .join(' · ')}
                  </p>
                  <button
                    aria-label={
                      exampleForm === 'C'
                        ? t('Послушать открытый C', 'Hear open C')
                        : t('Послушать C в форме A', 'Hear C in the A shape')
                    }
                    onClick={() => void listen(['C'], false, [exampleForm])}
                  >
                    {t('Послушать', 'Listen')}
                  </button>
                </figure>
              ))}
            </div>
          </details>
        </aside>
      )}
      {conflicted && (
        <p role="alert">
          {t(
            'Черновик изменён в другой вкладке. Здесь остаётся ваша версия.',
            'The draft changed in another tab. Your version is still open here.',
          )}{' '}
          <button
            onClick={async () => {
              if (
                !window.confirm(
                  t(
                    'Отбросить правки этой вкладки и открыть сохранённую версию?',
                    'Discard the edits in this tab and open the saved version?',
                  ),
                )
              )
                return;
              stop();
              setReady(false);
              setConflicted(false);
              try {
                const saved = await loadLoop(true);
                history.current = [];
                select(0);
                preview(null);
                setPendingForm(null);
                setReplace(false);
                setLoop(
                  saved.loop ?? { version: 1, center: 'Am', bars: ['Am'], bpm: defaultTempo },
                );
                setReady(true);
                error('');
              } catch {
                fail(true);
              }
            }}
          >
            {t('Открыть сохранённую версию', 'Open saved version')}
          </button>
        </p>
      )}
      {problem === 'save' && (
        <p role="alert">
          {t('Не удалось сохранить.', 'Save failed.')}{' '}
          <button onClick={() => persist(loop)}>{t('Повторить', 'Retry')}</button>
        </p>
      )}
    </main>
  );
}
