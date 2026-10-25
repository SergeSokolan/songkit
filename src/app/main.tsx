import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { DrumEditor } from '../pages/drum-editor';
import { loadDraft } from '../features/draft-recovery';
import type { Draft } from '../entities/drum-pattern';
import './styles/global.css';
function App() {
  const [boot, setBoot] = useState<{ draft: Draft | null; error: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [offlineError, setOfflineError] = useState('');
  const {
    needRefresh: [updateAvailable],
  } = useRegisterSW({
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
  if (!boot)
    return (
      <div className="boot-screen">
        songkit<span>.</span>
        <p>Открываем мастерскую…</p>
      </div>
    );
  return (
    <>
      {offlineError && (
        <div role="alert" className="inline-notice warning">
          {offlineError}
        </div>
      )}
      <DrumEditor
        initial={boot.draft}
        recoveryError={boot.error}
        offlineReady={ready}
        updateAvailable={updateAvailable}
      />
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
