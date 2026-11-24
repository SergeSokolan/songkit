import { GroovePanel } from '../../../features/manage-grooves';
import { FillPanel, applyFill, type Fill, type FillRange } from '../../../features/manage-fills';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
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
import { ScoreButton } from '../../../widgets/drum-score';
import { TransportPanel } from '../../../widgets/transport-panel';
import { Icon } from '../../../shared/ui/icon';
import { useLanguage, instrumentName, type Language } from '../../../shared/i18n';
import { localizedMessage } from './localized-message';
const hitPlural = new Intl.PluralRules('ru');
const hitForms: Record<string, string> = {
  one: 'удар',
  few: 'удара',
  many: 'ударов',
  other: 'удара',
};
function describePreviewRange({ start, end }: FillRange, language: Language) {
  const firstBar = Math.floor(start / BAR_TICKS) + 1;
  const lastBar = Math.ceil(end / BAR_TICKS);
  const english = language === 'en';
  if (start % BAR_TICKS === 0 && end % BAR_TICKS === 0) {
    if (english)
      return firstBar === lastBar ? `All of bar ${firstBar}` : `Bars ${firstBar}–${lastBar}`;
    return firstBar === lastBar ? `Такт ${firstBar} целиком` : `Такты ${firstBar}–${lastBar}`;
  }
  const boundary = (tick: number) => {
    const bar = Math.floor(tick / BAR_TICKS) + 1;
    const beat = 1 + (tick % BAR_TICKS) / PPQ;
    return english
      ? `bar ${bar}, beat ${beat.toLocaleString('en')}`
      : `такт ${bar}, доля ${beat.toLocaleString('ru-RU')}`;
  };
  const endLabel =
    end % BAR_TICKS === 0
      ? english
        ? `end of bar ${lastBar}`
        : `конец такта ${lastBar}`
      : boundary(end);
  return `${english ? 'Range' : 'Участок'}: ${boundary(start)} → ${endLabel}`;
}
interface Props {
  visible: boolean;
  guitarLink?: React.ReactNode;
  guideHref: string;
  onGuide: MouseEventHandler<HTMLAnchorElement>;
  preferences?: ReactNode;
  initial: Draft | null;
  recoveryError: string;
  offlineReady: boolean;
  updateAvailable: boolean;
  onUpdate: () => Promise<void>;
}
export function DrumEditor({
  visible,
  guitarLink,
  guideHref,
  onGuide,
  preferences,
  initial,
  recoveryError,
  offlineReady,
  updateAvailable,
  onUpdate,
}: Props) {
  const language = useLanguage();
  const editorRoot = useRef<HTMLDivElement>(null);
  const english = language === 'en';
  const t = (ru: string, en: string) => (english ? en : ru);
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
  const stopPlayback = playback.stop;
  useEffect(() => {
    if (!visible) {
      editorRoot.current?.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((dialog) => {
        dialog.close();
      });
      stopPlayback();
      setFillPreview(null);
    }
  }, [stopPlayback, visible]);
  const cancelPreview = () => {
    if (activePreview) playback.stop();
    setFillPreview(null);
  };
  const previewFill = (fill: Fill, range: FillRange, allowMissing: boolean) => {
    if (activePreview?.fillId === fill.id) {
      cancelPreview();
      return;
    }
    const nextPattern = applyFill(pattern, range, fill, allowMissing);
    setFillPreview({
      base: revision,
      pattern: nextPattern,
      range,
      fillId: fill.id,
      view: {
        ...view,
        bar: Math.floor(range.start / BAR_TICKS),
        grid: fill.events.some((e) => e.tick % 120 !== 0) ? '16T' : 16,
        scrollLeft: 0,
      },
    });
    void playback.play({ pattern: nextPattern, start: range.start, end: range.end });
  };
  const previewDetails = activePreview && (
    <>
      <p role="status">
        {describePreviewRange(activePreview.range, language)}
        {t(' · Дорожки замены: ', ' · Tracks to replace: ')}
        {activePreview.range.tracks
          .map((track) => instrumentName(language, track, INSTRUMENT_DETAILS[track].name))
          .join(', ')}
        .
        {activePreview.pattern.instruments.some(
          (track) => !pattern.instruments.includes(track),
        ) && (
          <>
            {' '}
            {t('Добавятся:', 'Tracks to add:')}{' '}
            {activePreview.pattern.instruments
              .filter((track) => !pattern.instruments.includes(track))
              .map((track) => instrumentName(language, track, INSTRUMENT_DETAILS[track].name))
              .join(', ')}
            .
          </>
        )}
      </p>
      {playback.error && (
        <p role="alert" className="inline-notice warning">
          {localizedMessage(language, playback.error, 'Audio could not start.')}
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
        t(
          'Обновить SongKit? История отмены, неподтверждённый брейк и ввод темпа будут сброшены.',
          'Update SongKit? Undo history, an unapplied fill and any unfinished tempo edit will reset.',
        ),
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
        t(
          'Удары за пределами новой длины будут удалены. Действие можно отменить. Продолжить?',
          'Hits beyond the new length will be removed. You can undo this. Continue?',
        ),
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
        t(
          'Очистить текущую партию и заменить локальный черновик? Скачайте проект, если хотите сохранить его отдельно.',
          'Clear the current pattern and replace the local draft? Download the project to keep a separate copy.',
        ),
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
        !window.confirm(
          t(
            'Заменить текущую партию проектом из файла? Действие можно отменить.',
            'Replace the current pattern with the project from this file? You can undo this.',
          ),
        )
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
    <div className="app-shell" ref={editorRoot}>
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="SongKit">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          songkit<span className="brand-dot">.</span>
        </a>
        <div className="header-meta">
          <span className={`connection-status ${offlineReady ? 'ready' : ''}`} role="status">
            <span />
            {offlineReady
              ? t('Доступно офлайн', 'Available offline')
              : t('Подготовка офлайн…', 'Preparing offline access…')}
          </span>
          <a
            className="github-link"
            href="https://github.com/SergeSokolan/songkit"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('Исходный код SongKit на GitHub', 'SongKit source code on GitHub')}
          >
            <Icon name="github" size={18} />
            <span className="app-version">v{import.meta.env.VITE_APP_VERSION ?? 'dev'}</span>
          </a>
        </div>
        {preferences}
      </header>
      {updateAvailable && (
        <section className="inline-notice" aria-label={t('Обновление SongKit', 'SongKit update')}>
          <span role="status">
            {updateBusy
              ? t('Обновляем…', 'Updating…')
              : updateDeferred
                ? t('Обновление отложено.', 'Update postponed.')
                : t('Доступна новая версия SongKit.', 'A new version of SongKit is available.')}
          </span>
          <button
            className="secondary-button"
            disabled={updateBusy}
            onClick={() => void updateApp()}
          >
            {t('Обновить', 'Update')}
          </button>
          {!updateDeferred && (
            <button
              className="secondary-button"
              disabled={updateBusy}
              onClick={() => setUpdateDeferred(true)}
            >
              {t('Позже', 'Later')}
            </button>
          )}
          {updateError && (
            <p role="alert">
              {localizedMessage(language, updateError, 'Could not update the app.')}
            </p>
          )}
        </section>
      )}
      <main inert={updateBusy}>
        <div className="page-heading editor-heading">
          <h1>{t('Барабанный редактор', 'Drum editor')}</h1>
          <nav className="editor-shortcuts" aria-label={t('Действия редактора', 'Editor actions')}>
            {guitarLink}
            <button className="secondary-button" onClick={newPattern}>
              {t('Новая партия', 'New pattern')}
            </button>
            <a className="secondary-button" href="#pattern-library">
              {t('Ритмы и брейки', 'Grooves and drum fills')}
            </a>
            <a className="secondary-button" href="#project-actions">
              {t('Файлы', 'Files')}
            </a>
            <ScoreButton pattern={pattern} bar={bar} />
          </nav>
        </div>
        {recoveryError && !saveEnabled && (
          <div role="alert" className="inline-notice warning">
            {t('Не удалось восстановить черновик', 'Could not restore the draft')}:{' '}
            {localizedMessage(language, recoveryError, 'Storage is unavailable')}.{' '}
            {t(
              'Старые данные не перезаписаны. Можно скачать текущую партию или выбрать «Новая партия» для сброса.',
              'The previous draft is still on this device. Download this pattern or choose New pattern to reset the draft.',
            )}
          </div>
        )}
        {notice && (
          <div className="inline-notice" role="status">
            {localizedMessage(language, notice, '')}
            <button
              aria-label={t('Убрать сообщение', 'Dismiss message')}
              onClick={() => setNotice('')}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        <div className="editor-card">
          <div className="card-topline">
            <div className="session-title">
              <span className="live-dot" />
              <strong>{t('Мой грув', 'My groove')}</strong>
            </div>
            <div className="history-actions">
              <button
                className="icon-button"
                aria-label={t('Отменить', 'Undo')}
                disabled={!canUndo}
                onClick={undo}
              >
                <Icon name="undo" />
              </button>
              <button
                className="icon-button"
                aria-label={t('Повторить', 'Redo')}
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
              {localizedMessage(language, playback.error, 'Audio could not start.')}
            </div>
          )}
          <div className="sequence-toolbar">
            <div className="bar-tabs" aria-label={t('Такты', 'Bars')}>
              {Array.from({ length: pattern.barCount }, (_, i) => (
                <button
                  key={i}
                  className={`bar-tab ${visibleBar === i ? 'selected' : ''} ${playback.playing && Math.floor(playback.position / BAR_TICKS) === i ? 'sounding' : ''}`}
                  aria-label={`${t('Такт', 'Bar')} ${i + 1}`}
                  aria-pressed={visibleBar === i}
                  onClick={() => {
                    cancelPreview();
                    setView((v) => ({ ...v, bar: i, scrollLeft: 0 }));
                  }}
                >
                  <span className="small">{t('ТАКТ', 'BAR')}</span>
                  <strong>{String(i + 1).padStart(2, '0')}</strong>
                </button>
              ))}
              {pattern.barCount < 4 && (
                <button
                  className="add-bar"
                  aria-label={t('Добавить такт', 'Add bar')}
                  onClick={() => resize(pattern.barCount + 1)}
                >
                  <Icon name="plus" size={18} />
                </button>
              )}
            </div>
            <label className="length-control">
              <span>{t('Длина', 'Length')}</span>
              <select
                aria-label={t('Количество тактов', 'Number of bars')}
                value={pattern.barCount}
                onChange={(e) => resize(Number(e.target.value))}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? t('такт', 'bar') : t('такта', 'bars')}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div id="pattern-grid" className="grid-toolbar" tabIndex={-1}>
            <span className="eyebrow">{t('РИСУНОК', 'PATTERN')}</span>
            <div className="grid-controls">
              <span>{t('Сетка', 'Grid')}</span>
              <div className="segmented" aria-label={t('Деление сетки', 'Grid subdivision')}>
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
          <div
            className="grid-transport"
            aria-label={t('Транспорт у сетки', 'Grid playback controls')}
          >
            <button
              className="secondary-button"
              disabled={playback.loading}
              aria-label={
                playback.playing
                  ? t('Пауза у сетки', 'Pause at grid')
                  : t('Играть у сетки', 'Play at grid')
              }
              aria-busy={playback.loading}
              onClick={playback.playing ? playback.stop : () => void playback.play()}
            >
              <Icon name={playback.playing ? 'pause' : 'play'} />
            </button>
            <span>
              {playback.error
                ? t('Ошибка звука', 'Audio error')
                : activePreview
                  ? t('Предпросмотр', 'Preview')
                  : t('Партия', 'Pattern')}{' '}
              · 4/4
            </span>
          </div>
          <p className="grid-entry-hint">
            {t(
              'Касания: пусто → обычный → тихий → пусто',
              'Tap to cycle: empty → normal hit → ghost note → empty',
            )}
          </p>
          <fieldset
            disabled={!!activePreview}
            className="preview-grid"
            aria-label={t('Редактор партии', 'Pattern editor')}
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
                {t('Тихий', 'Ghost note')}
              </span>
              <span>
                <i className="legend-dot" />
                {t('Обычный', 'Normal hit')}
              </span>
              <span>
                <i className="legend-dot accent" />
                {t('Акцент', 'Accent')}
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
              {saveEnabled
                ? localizedMessage(language, autosave.status, 'Saving…')
                : t('Автосохранение приостановлено', 'Autosave paused')}
            </span>
            <span className="small muted">
              {pattern.events.length.toLocaleString(language)}{' '}
              {english
                ? pattern.events.length === 1
                  ? 'hit'
                  : 'hits'
                : hitForms[hitPlural.select(pattern.events.length)]}{' '}
              · 4/4
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
            <h2 id="pattern-library-heading">{t('Ритмы и брейки', 'Grooves and drum fills')}</h2>
            <a className="secondary-button" href="#pattern-grid">
              {t('К сетке', 'Back to grid')}
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
            onCancel={cancelPreview}
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
            onCancel={cancelPreview}
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
            <span className="privacy-icon">⌁</span>
            {t('Ваш бит остаётся на вашем устройстве.', 'Your beat stays on this device.')}
            <br />
            <span>
              {t('Без аккаунта. Без облака. Просто музыка.', 'No account or cloud storage needed.')}
            </span>
          </p>
          <div className="file-actions">
            <button className="secondary-button" onClick={() => exportMidi(pattern)}>
              <Icon name="download" size={18} />
              MIDI
            </button>
            <button className="secondary-button" onClick={() => exportProject(pattern)}>
              <Icon name="download" size={18} />
              {t('Проект', 'Project')}
            </button>
            <button
              className="icon-button"
              title={t('Открыть проект', 'Open project')}
              aria-label={t('Открыть проект', 'Open project')}
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
                  {localizedMessage(language, importError, 'Could not open the project')}.{' '}
                  {t(
                    'Выберите другой файл проекта SongKit.',
                    'Choose a different SongKit project file.',
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
        <section className="help-row">
          <div>
            <span className="help-index">01 /</span>
            <h2>{t('Соберите основу', 'Build the foundation')}</h2>
            <p>
              {t(
                'Бочка, малый и хэт. Касайтесь клетки: обычный удар, тихий удар, затем удаление.',
                'Start with kick, snare and hi-hat. Tap a cell to add a hit, turn it into a ghost note, then remove it.',
              )}
            </p>
          </div>
          <div>
            <span className="help-index">02 /</span>
            <h2>{t('Добавьте деталей', 'Add detail')}</h2>
            <p>
              {t(
                'Переключитесь на 1/16 или 1/32. Прежние удары останутся на своих местах.',
                'Switch to 1/16 or 1/32. Existing hits stay in place.',
              )}
            </p>
          </div>
          <div>
            <span className="help-index">03 /</span>
            <h2>{t('Почувствуйте динамику', 'Shape the dynamics')}</h2>
            <p>
              {t(
                'Повторное касание делает удар тихим. Перенос доступен через «Изменить / перенести удар».',
                'Tap again for a ghost note. Use Edit / move hit to move it.',
              )}
            </p>
          </div>
        </section>
        <div className="workspace-actions">
          <button
            className="text-button"
            onClick={() => {
              if (
                pattern.events.length &&
                !window.confirm(
                  t(
                    'Заменить рисунок примером? Действие можно отменить.',
                    'Replace the pattern with the example? You can undo this.',
                  ),
                )
              )
                return;
              playback.reset();
              change(() => demoPattern());
              setView({ ...defaultView });
            }}
          >
            {t('Загрузить пример', 'Load example')}
          </button>
        </div>
      </main>
      <footer className="site-footer">
        <span>SONGKIT / DRUM WORKSHOP</span>
        <a
          className="text-button"
          href={`${import.meta.env.BASE_URL}sounds/muldjord/ATTRIBUTION.txt`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('Звуки MuldjordKit', 'MuldjordKit sounds')}
        </a>

        <a className="text-button" href={guideHref} onClick={onGuide}>
          {t('Инструкция по установке', 'Installation guide')}
        </a>
      </footer>
    </div>
  );
}
