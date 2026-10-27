import { GroovePanel } from '../../../features/manage-grooves';
import { FillPanel, applyFill, type Fill, type FillRange } from '../../../features/manage-fills';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BAR_TICKS,
  GRIDS,
  gridLabel,
  addInstrument,
  createPattern,
  demoPattern,
  defaultView,
  moveHit,
  resizePattern,
  setHit,
  setTempo,
  totalTicks,
  type Draft,
  type EditorView,
  type Instrument,
} from '../../../entities/drum-pattern';
import { usePattern } from '../../../features/edit-pattern';
import { AudioHelp, usePlayback } from '../../../features/playback';
import { useAutosave } from '../../../features/draft-recovery';
import { exportMidi, exportProject, importProject } from '../../../features/export-pattern';
import { InstrumentPicker } from '../../../widgets/instrument-picker';
import { DrumGrid } from '../../../widgets/drum-grid';
import { TransportPanel } from '../../../widgets/transport-panel';
import { Icon } from '../../../shared/ui/icon';
interface Props {
  initial: Draft | null;
  recoveryError: string;
  offlineReady: boolean;
  updateAvailable: boolean;
}
export function DrumEditor({ initial, recoveryError, offlineReady, updateAvailable }: Props) {
  const { pattern, revision, change, canUndo, canRedo, undo, redo } = usePattern(
    initial?.pattern ?? demoPattern(),
  );
  const [fillPreview, setFillPreview] = useState<{
    base: typeof revision;
    pattern: typeof pattern;
    range: FillRange;
    fillId: string;
    view: EditorView;
  } | null>(null);
  const activePreview = fillPreview?.base === revision ? fillPreview : null;
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setFillPreview(null);
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', hide);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', hide);
    };
  }, []);
  const previewFill = (fill: Fill, range: FillRange, allowMissing: boolean) => {
    setFillPreview({
      base: revision,
      pattern: applyFill(pattern, range, fill, allowMissing),
      range,
      fillId: fill.id,
      view: {
        ...view,
        bar: Math.floor(range.start / BAR_TICKS),
        grid: fill.events.some((e) => e.tick % 120 !== 0) ? '16T' : 16,
        scrollLeft: ((range.start % BAR_TICKS) / 240) * 48,
      },
    });
  };
  const [view, setView] = useState<EditorView>(initial?.view ?? defaultView);
  const [saveEnabled, setSaveEnabled] = useState(!recoveryError);
  const [notice, setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const bar = Math.min(view.bar, pattern.barCount - 1);
  const editorView = activePreview?.view ?? view;
  const visibleBar = Math.min(editorView.bar, pattern.barCount - 1);
  const changeEditorView = (update: (v: EditorView) => EditorView) => {
    if (activePreview)
      setFillPreview((current) => (current ? { ...current, view: update(current.view) } : current));
    else setView(update);
  };
  const draft = useMemo<Draft>(
    () => ({
      schemaVersion: 1,
      pattern,
      view: { ...view, bar, position: view.position % totalTicks(pattern) },
    }),
    [pattern, view, bar],
  );
  const autosave = useAutosave(draft, saveEnabled);
  const playback = usePlayback(
    pattern,
    draft.view.position,
    (tick) => {
      const position = tick % totalTicks(pattern);
      setView((v) => ({ ...v, position }));
      autosave.flush({ ...draft, view: { ...draft.view, position } });
    },
    activePreview
      ? {
          pattern: activePreview.pattern,
          start: activePreview.range.start,
          end: activePreview.range.end,
        }
      : undefined,
  );
  const hit = (instrument: Instrument, tick: number, velocity: number | null) => {
    change((p) => setHit(p, instrument, tick, velocity));
    if (velocity !== null) void playback.preview({ id: '', instrument, tick, velocity });
  };
  const resize = (count: number) => {
    if (
      count < pattern.barCount &&
      pattern.events.some((e) => e.tick >= count * BAR_TICKS) &&
      !window.confirm(
        'Удары за пределами новой длины будут удалены. Действие можно отменить. Продолжить?',
      )
    )
      return;
    change((p) => resizePattern(p, count));
    setView((v) => ({
      ...v,
      bar: Math.min(v.bar, count - 1),
      position: v.position % (count * BAR_TICKS),
    }));
  };
  const newPattern = () => {
    if (
      (pattern.events.length || recoveryError) &&
      !window.confirm(
        'Очистить текущую партию и заменить локальный черновик? Скачайте проект, если хотите сохранить его отдельно.',
      )
    )
      return;
    playback.reset();
    change(() => createPattern());
    setView({ ...defaultView });
    setSaveEnabled(true);
    setNotice('Новая партия. Очистку нот можно отменить.');
  };
  const loadFile = async (file: File) => {
    try {
      const imported = await importProject(file);
      if (
        pattern.events.length &&
        !window.confirm('Заменить текущую партию проектом из файла? Действие можно отменить.')
      )
        return;
      playback.reset();
      change(() => imported);
      setView({ ...defaultView });
      setNotice(
        saveEnabled
          ? 'Проект открыт.'
          : 'Проект открыт. Автосохранение заблокировано: старый черновик сохранён для восстановления.',
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось открыть проект');
    }
  };
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="SongKit">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          songkit<span className="brand-dot">.</span>
        </a>
        <span className="product-label">ВАША МУЗЫКАЛЬНАЯ МАСТЕРСКАЯ</span>
        <span className={`connection-status ${offlineReady ? 'ready' : ''}`} role="status">
          <span />
          {offlineReady ? 'Доступно офлайн' : 'Подготовка офлайн…'}
        </span>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow section-kicker">
              <span>01</span> БАРАБАННАЯ МАСТЕРСКАЯ
            </div>
            <h1>
              Всё начинается
              <br className="mobile-break" /> с ритма<span>.</span>
            </h1>
            <p className="intro">Наберите бит. Найдите свой грув.</p>
          </div>
          <div className="heading-note">
            <span className="tiny-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <span>
              Меньше настроек.
              <br />
              Больше музыки.
            </span>
          </div>
        </div>
        {updateAvailable && (
          <div className="inline-notice">
            Доступно обновление. Скачайте проект и закройте все вкладки SongKit, чтобы применить
            его.
          </div>
        )}
        {recoveryError && !saveEnabled && (
          <div role="alert" className="inline-notice warning">
            Не удалось восстановить черновик: {recoveryError}. Старые данные не перезаписаны. Можно
            скачать текущую партию или выбрать «Новая партия» для сброса.
          </div>
        )}
        {notice && (
          <div className="inline-notice" role="status">
            {notice}
            <button aria-label="Убрать сообщение" onClick={() => setNotice('')}>
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        <div className="editor-card">
          <div className="card-topline">
            <div className="session-title">
              <span className="live-dot" />
              <strong>Мой грув</strong>
              <span className="prototype-badge">ПРОТОТИП</span>
            </div>
            <div className="history-actions">
              <button
                className="icon-button"
                aria-label="Отменить"
                disabled={!canUndo}
                onClick={undo}
              >
                <Icon name="undo" />
              </button>
              <button
                className="icon-button"
                aria-label="Повторить"
                disabled={!canRedo}
                onClick={redo}
              >
                <Icon name="redo" />
              </button>
            </div>
          </div>
          <TransportPanel
            tempo={pattern.tempo}
            playing={playback.playing}
            loading={playback.loading}
            onTempo={(tempo) => change((p) => setTempo(p, tempo))}
            onPlay={() => void playback.play()}
            onPause={playback.stop}
            onReset={playback.reset}
          />
          <AudioHelp
            loading={playback.loading}
            tested={playback.soundTested}
            onCheck={() => void playback.checkSound()}
          />
          {playback.error && (
            <div role="alert" className="inline-notice warning">
              {playback.error}
            </div>
          )}
          <div className="sequence-toolbar">
            <div className="bar-tabs" aria-label="Такты">
              {Array.from({ length: pattern.barCount }, (_, i) => (
                <button
                  key={i}
                  className={`bar-tab ${visibleBar === i ? 'selected' : ''} ${playback.playing && Math.floor(playback.position / BAR_TICKS) === i ? 'sounding' : ''}`}
                  aria-label={`Такт ${i + 1}`}
                  aria-pressed={visibleBar === i}
                  onClick={() => {
                    setFillPreview(null);
                    setView((v) => ({ ...v, bar: i, scrollLeft: 0 }));
                  }}
                >
                  <span className="small">ТАКТ</span>
                  <strong>{String(i + 1).padStart(2, '0')}</strong>
                </button>
              ))}
              {pattern.barCount < 4 && (
                <button
                  className="add-bar"
                  aria-label="Добавить такт"
                  onClick={() => resize(pattern.barCount + 1)}
                >
                  <Icon name="plus" size={18} />
                </button>
              )}
            </div>
            <label className="length-control">
              <span>Длина</span>
              <select
                aria-label="Количество тактов"
                value={pattern.barCount}
                onChange={(e) => resize(Number(e.target.value))}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'такт' : 'такта'}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid-toolbar">
            <span className="eyebrow">РИСУНОК</span>
            <div className="grid-controls">
              <span>Сетка</span>
              <div className="segmented" aria-label="Деление сетки">
                {GRIDS.map((grid) => (
                  <button
                    key={grid}
                    aria-pressed={editorView.grid === grid}
                    className={editorView.grid === grid ? 'selected' : ''}
                    onClick={() => changeEditorView((v) => ({ ...v, grid, scrollLeft: 0 }))}
                  >
                    {gridLabel(grid)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <InstrumentPicker
            instruments={pattern.instruments}
            onAdd={(instrument) => change((p) => addInstrument(p, instrument))}
          />
          <FillPanel
            bar={bar}
            key={`fills-${pattern.barCount}`}
            pattern={pattern}
            previewing={!!activePreview}
            activeId={activePreview?.fillId}
            onPreview={previewFill}
            onCancel={() => setFillPreview(null)}
            onApply={() => {
              if (activePreview) {
                change(() => activePreview.pattern);
                setView(activePreview.view);
                setFillPreview(null);
              }
            }}
          />
          <GroovePanel
            bar={bar}
            key={pattern.barCount}
            pattern={pattern}
            activeId={activePreview?.fillId}
            onPreview={previewFill}
            onCancel={() => setFillPreview(null)}
            onApply={() => {
              if (activePreview) {
                change(() => activePreview.pattern);
                setView(activePreview.view);
                setFillPreview(null);
              }
            }}
          />
          <div className="grid-transport" aria-label="Транспорт у сетки">
            <button
              className="secondary-button"
              disabled={playback.loading}
              onClick={playback.playing ? playback.stop : () => void playback.play()}
            >
              <Icon name={playback.playing ? 'pause' : 'play'} />
              {playback.loading
                ? 'Подготовка звука'
                : playback.playing
                  ? 'Пауза у сетки'
                  : 'Играть у сетки'}
            </button>
            <span>
              {playback.error ? 'Ошибка звука' : activePreview ? 'Предпросмотр' : 'Партия'} · 4/4
            </span>
          </div>
          <fieldset
            disabled={!!activePreview}
            className="preview-grid"
            aria-label="Редактор партии"
          >
            <DrumGrid
              pattern={activePreview?.pattern ?? pattern}
              fillRange={activePreview?.range}
              bar={visibleBar}
              grid={editorView.grid}
              position={playback.position}
              playing={playback.playing}
              scrollLeft={editorView.scrollLeft}
              onScroll={(scrollLeft) =>
                changeEditorView((v) => (v.scrollLeft === scrollLeft ? v : { ...v, scrollLeft }))
              }
              onHit={hit}
              onMove={(instrument, from, to) => change((p) => moveHit(p, instrument, from, to))}
            />
          </fieldset>
          <div className="grid-footer">
            <div className="legend">
              <span>
                <i className="legend-dot ghost" />
                Тихий
              </span>
              <span>
                <i className="legend-dot" />
                Обычный
              </span>
              <span>
                <i className="legend-dot accent" />
                Акцент
              </span>
            </div>
            <span className="grid-hint">Касания: пусто → обычный → тихий → пусто</span>
          </div>
          <div className="card-bottom">
            <span className="save-status" role="status">
              <span className="save-dot" />
              {saveEnabled ? autosave.status : 'Автосохранение приостановлено'}
            </span>
            <span className="small muted">{pattern.events.length} ударов · 4/4</span>
          </div>
        </div>
        <div className="below-editor">
          <p className="privacy-note">
            <span className="privacy-icon">⌁</span>Ваш бит остаётся на вашем устройстве.
            <br />
            <span>Без аккаунта. Без облака. Просто музыка.</span>
          </p>
          <div className="file-actions">
            <button className="secondary-button" onClick={() => exportMidi(pattern)}>
              <Icon name="download" size={18} />
              MIDI
            </button>
            <button className="secondary-button" onClick={() => exportProject(pattern)}>
              <Icon name="download" size={18} />
              Проект
            </button>
            <button
              className="icon-button"
              title="Открыть проект"
              aria-label="Открыть проект"
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="upload" />
            </button>
            <input
              hidden
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void loadFile(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
        <section className="help-row">
          <div>
            <span className="help-index">01 /</span>
            <h2>Соберите основу</h2>
            <p>Бочка, малый и хэт. Касайтесь клетки: обычный удар, тихий удар, затем удаление.</p>
          </div>
          <div>
            <span className="help-index">02 /</span>
            <h2>Добавьте деталей</h2>
            <p>Переключитесь на 1/16 или 1/32. Прежние удары останутся на своих местах.</p>
          </div>
          <div>
            <span className="help-index">03 /</span>
            <h2>Почувствуйте динамику</h2>
            <p>
              Повторное касание делает удар тихим. Перенос доступен через «Изменить / перенести
              удар».
            </p>
          </div>
        </section>
        <div className="workspace-actions">
          <button className="text-button" onClick={newPattern}>
            Новая партия
          </button>
          <button
            className="text-button"
            onClick={() => {
              if (
                pattern.events.length &&
                !window.confirm('Заменить рисунок примером? Действие можно отменить.')
              )
                return;
              playback.reset();
              change(() => demoPattern());
              setView({ ...defaultView });
            }}
          >
            Загрузить пример
          </button>
        </div>
      </main>
      <footer className="site-footer">
        <span>SONGKIT / DRUM WORKSHOP</span>
        <a
          className="github-link"
          href="https://github.com/SergeSokolan/songkit"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Исходный код SongKit на GitHub"
        >
          <Icon name="github" size={18} />
          GitHub<span className="app-version">v{import.meta.env.VITE_APP_VERSION ?? 'dev'}</span>
        </a>
      </footer>
    </div>
  );
}
