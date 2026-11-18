import { StrictMode, useEffect, useRef, useState, type MouseEventHandler } from 'react';
import { createRoot } from 'react-dom/client';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { DrumEditor } from '../pages/drum-editor';
import { WelcomePage } from '../pages/welcome';
import { InstallationGuide } from '../pages/installation-guide';
import { loadDraft } from '../features/draft-recovery';
import type { Draft } from '../entities/drum-pattern';
import { activateUpdate } from './activate-update';
import { Preferences, PreferencesControls } from './preferences';
import { useLanguage } from '../shared/i18n';
import {
  alreadyOpenedEditor,
  entryHref,
  readEntryView,
  rememberEditorVisit,
  type EntryView,
} from './entry-view';
import { useInstallation } from './use-installation';
import './styles/global.css';
function App() {
  const english = useLanguage() === 'en';
  const { installed, install } = useInstallation();
  const [initialEditor] = useState(() => alreadyOpenedEditor() || installed);
  const [explicitView, setExplicitView] = useState(readEntryView);
  const [keepEditor, setKeepEditor] = useState(false);
  const focusHeading = useRef(false);
  const visiblePage = useRef<HTMLDivElement>(null);
  const [boot, setBoot] = useState<{ draft: Draft | null; error: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [offlineError, setOfflineError] = useState('');
  const {
    needRefresh: [updateAvailable],
  } = useRegisterSW({
    onNeedReload() {},
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (!document.hidden && navigator.onLine) void registration.update().catch(() => {});
      };
      document.addEventListener('visibilitychange', check);
      window.addEventListener('online', check);
    },
    onOfflineReady() {
      setReady(true);
    },
    onRegisterError() {
      setOfflineError('Офлайн-режим недоступен. Проверьте соединение и перезагрузите страницу.');
    },
  });
  useEffect(() => {
    let active = true;
    loadDraft().then(
      (draft) => {
        if (active) setBoot({ draft, error: '' });
      },
      (error) => {
        if (active)
          setBoot({
            draft: null,
            error: error instanceof Error ? error.message : 'Хранилище недоступно',
          });
      },
    );
    if ('serviceWorker' in navigator)
      void navigator.serviceWorker.ready.then(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const view =
    explicitView ?? (boot && (initialEditor || boot.draft || boot.error ? 'editor' : 'welcome'));
  const readyView = view === 'editor' && !boot ? null : view;
  useEffect(() => {
    const pop = () => {
      focusHeading.current = true;
      setExplicitView(readEntryView());
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    if (readyView === 'editor') {
      setKeepEditor(true);
      rememberEditorVisit();
    }
    if (readyView && focusHeading.current) {
      focusHeading.current = false;
      const heading = visiblePage.current?.querySelector('h1');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      window.scrollTo(0, 0);
    }
  }, [readyView]);

  const navigate =
    (next: EntryView): MouseEventHandler<HTMLAnchorElement> =>
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      if (readyView === next) return;
      history.pushState(null, '', entryHref(next));
      focusHeading.current = true;
      setExplicitView(next);
    };

  return (
    <>
      {offlineError && (
        <div role="alert" className="inline-notice warning">
          {english
            ? 'Offline mode is unavailable. Check your connection and reload.'
            : offlineError}
        </div>
      )}
      {boot && (keepEditor || readyView === 'editor') && (
        <div hidden={readyView !== 'editor'} ref={readyView === 'editor' ? visiblePage : undefined}>
          <DrumEditor
            visible={readyView === 'editor'}
            guideHref={entryHref('guide')}
            onGuide={navigate('guide')}
            preferences={<PreferencesControls />}
            initial={boot.draft}
            recoveryError={boot.error}
            offlineReady={ready}
            updateAvailable={updateAvailable}
            onUpdate={activateUpdate}
          />
        </div>
      )}
      {readyView === 'welcome' && (
        <div ref={visiblePage}>
          <WelcomePage
            editorHref={entryHref('editor')}
            guideHref={entryHref('guide')}
            onEditor={navigate('editor')}
            onGuide={navigate('guide')}
          />
        </div>
      )}
      {readyView === 'guide' && (
        <div ref={visiblePage}>
          <InstallationGuide
            editorHref={entryHref('editor')}
            welcomeHref={entryHref('welcome')}
            onEditor={navigate('editor')}
            onWelcome={navigate('welcome')}
            install={install}
            installed={installed}
          />
        </div>
      )}
      {!readyView && (
        <div className="boot-screen">
          songkit<span>.</span>
          <p>{english ? 'Opening the workshop…' : 'Открываем мастерскую…'}</p>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preferences>
      <App />
    </Preferences>
  </StrictMode>,
);
