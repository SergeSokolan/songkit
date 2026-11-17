import { GroovePanel } from '../../../features/manage-grooves';
import { FillPanel, applyFill, type Fill, type FillRange } from '../../../features/manage-fills';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BAR_TICKS,
  PPQ,
  INSTRUMENT_DETAILS,
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
const hitPlural = new Intl.PluralRules('ru');
const hitForms: Record<string, string> = {
  one: 'удар',
  few: 'удара',
  many: 'ударов',
  other: 'удара',
};
function describePreviewRange({ start, end }: FillRange) {
  const firstBar = Math.floor(start / BAR_TICKS) + 1;
  const lastBar = Math.ceil(end / BAR_TICKS);
  if (start % BAR_TICKS === 0 && end % BAR_TICKS === 0) {
    return firstBar === lastBar ? `Такт ${firstBar} целиком` : `Такты ${firstBar}–${lastBar}`;
  }
  const boundary = (tick: number) => {
    const bar = Math.floor(tick / BAR_TICKS) + 1;
    const beat = 1 + (tick % BAR_TICKS) / PPQ;
    return `такт ${bar}, доля ${beat.toLocaleString('ru-RU')}`;
  };
  const endLabel = end % BAR_TICKS === 0 ? `конец такта ${lastBar}` : boundary(end);
  return `Участок: ${boundary(start)} → ${endLabel}`;
}
interface Props {
  initial: Draft | null;
  recoveryError: string;
  offlineReady: boolean;
  updateAvailable: boolean;
  onUpdate: () => Promise<void>;
}
export function DrumEditor({
  initial,
  recoveryError,
  offlineReady,
  updateAvailable,
  onUpdate,
}: Props) {
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
        scrollLeft: 0,
      },
    });
  };
  const [view, setView] = useState<EditorView>(initial?.view ?? defaultView);
  const [saveEnabled, setSaveEnabled] = useState(!recoveryError);
  const [notice, setNotice] = useState('');
  const [updateDeferred, setUpdateDeferred] = useState(false);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const updating = useRef(false);
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const importAlertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (importError) importAlertRef.current?.scrollIntoView({ block: 'nearest' });
  }, [importError]);
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
      if (position === draft.view.position) return;
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
  const previewDetails = activePreview && (
    <>
      <p role="status">
        {describePreviewRange(activePreview.range)}
        {' · Дорожки замены: '}
        {activePreview.range.tracks.map((track) => INSTRUMENT_DETAILS[track].name).join(', ')}.
        {activePreview.pattern.instruments.some(
          (track) => !pattern.instruments.includes(track),
        ) && (
          <>
            {' '}
            Добавятся:{' '}
            {activePreview.pattern.instruments
              .filter((track) => !pattern.instruments.includes(track))
              .map((track) => INSTRUMENT_DETAILS[track].name)
              .join(', ')}
            .
          </>
        )}
      </p>
      <button
        className="secondary-button"
        disabled={playback.loading}
        onClick={
          playback.playing ? playback.stop : () => void playback.play(activePreview.range.start)
        }
      >
        {playback.playing ? 'Пауза предпросмотра' : 'Играть предпросмотр'}
      </button>
      {playback.error && (
        <p role="alert" className="inline-notice warning">
          {playback.error}
        </p>
      )}
    </>
  );
  const updateApp = async () => {
    if (updating.current) return;
    if (!saveEnabled) {
      setUpdateError('Автосохранение недоступно. Скачайте проект перед обновлением.');
      return;
    }
    if (
      !window.confirm(
        'Обновить SongKit? История отмены, неподтверждённый брейк и ввод темпа будут сброшены.',
      )
    )
      return;
    updating.current = true;
    setUpdateBusy(true);
    setUpdateError('');
    try {
      const position = playback.stop() % totalTicks(pattern);
      await autosave.flush({
        ...draft,
        view: { ...draft.view, position },
      });
    } catch {
      setUpdateError('Не удалось сохранить черновик. Скачайте проект и попробуйте ещё раз.');
      updating.current = false;
      setUpdateBusy(false);
      return;
    }
    try {
      await onUpdate();
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Не удалось обновить приложение.');
      updating.current = false;
      setUpdateBusy(false);
    }
  };
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
    setImportError('');
    try {
      const imported = await importProject(file);
      if (updating.current) return;
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
      setImportError(
        error instanceof Error && error.name === 'Error'
          ? error.message
          : 'Не удалось открыть проект',
      );
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
      {updateAvailable && (
        <section className="inline-notice" aria-label="Обновление SongKit">
          <span role="status">
            {updateBusy
              ? 'Обновляем…'
              : updateDeferred
                ? 'Обновление отложено.'
                : 'Доступна новая версия SongKit.'}
          </span>
          <button
            className="secondary-button"
            disabled={updateBusy}
            onClick={() => void updateApp()}
          >
            Обновить
          </button>
          {!updateDeferred && (
            <button
              className="secondary-button"
              disabled={updateBusy}
              onClick={() => setUpdateDeferred(true)}
            >
              Позже
            </button>
          )}
          {updateError && <p role="alert">{updateError}</p>}
        </section>
      )}
      <main inert={updateBusy}>
        <div className="page-heading editor-heading">
          <h1>Барабанный редактор</h1>
          <nav className="editor-shortcuts" aria-label="Действия редактора">
            <button className="secondary-button" onClick={newPattern}>
              Новая партия
            </button>
            <a className="secondary-button" href="#pattern-library">
              Ритмы и брейки
            </a>
            <a className="secondary-button" href="#project-actions">
              Файлы
            </a>
          </nav>
        </div>
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
          />
          {playback.error && !activePreview && (
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
          <div id="pattern-grid" className="grid-toolbar" tabIndex={-1}>
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
          <div className="grid-transport" aria-label="Транспорт у сетки">
            <button
              className="secondary-button"
              disabled={playback.loading}
              aria-label={playback.playing ? 'Пауза у сетки' : 'Играть у сетки'}
              aria-busy={playback.loading}
              onClick={playback.playing ? playback.stop : () => void playback.play()}
            >
              <Icon name={playback.playing ? 'pause' : 'play'} />
            </button>
            <span>
              {playback.error ? 'Ошибка звука' : activePreview ? 'Предпросмотр' : 'Партия'} · 4/4
            </span>
          </div>
          <p className="grid-entry-hint">Касания: пусто → обычный → тихий → пусто</p>
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
          </div>
          <InstrumentPicker
            instruments={pattern.instruments}
            onAdd={(instrument) => change((p) => addInstrument(p, instrument))}
          />
          <AudioHelp
            loading={playback.loading}
            tested={playback.soundTested}
            onCheck={() => void playback.checkSound()}
          />
          <div className="card-bottom">
            <span className="save-status" role="status">
              <span className="save-dot" />
              {saveEnabled ? autosave.status : 'Автосохранение приостановлено'}
            </span>
            <span className="small muted">
              {pattern.events.length} {hitForms[hitPlural.select(pattern.events.length)]} · 4/4
            </span>
          </div>
        </div>
        <section
          id="pattern-library"
          className="pattern-library"
          tabIndex={-1}
          aria-labelledby="pattern-library-heading"
        >
          <div className="library-heading">
            <h2 id="pattern-library-heading">Ритмы и брейки</h2>
            <a className="secondary-button" href="#pattern-grid">
              К сетке
            </a>
          </div>
          <FillPanel
            bar={bar}
            key={`fills-${pattern.barCount}`}
            pattern={pattern}
            previewing={!!activePreview}
            activeId={activePreview?.fillId}
            onPreview={previewFill}
            previewDetails={previewDetails}
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
            previewDetails={previewDetails}
            onCancel={() => setFillPreview(null)}
            onApply={() => {
              if (activePreview) {
                change(() => activePreview.pattern);
                setView(activePreview.view);
                setFillPreview(null);
              }
            }}
          />
        </section>
        <div id="project-actions" className="below-editor" tabIndex={-1}>
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
            <div className="import-feedback" ref={importAlertRef} role="alert">
              {importError && (
                <p className="inline-notice warning">
                  {importError}. Выберите другой файл проекта SongKit.
                </p>
              )}
            </div>
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
