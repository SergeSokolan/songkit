import { useCallback, useEffect, useRef, useState } from 'react';
import type { Draft } from '../../../entities/drum-pattern';
import { saveDraft } from './storage';
export function useAutosave(draft: Draft, enabled: boolean) {
  const [status, setStatus] = useState('Сохранение…');
  const queue = useRef(Promise.resolve());
  const latest = useRef(draft);
  const mounted = useRef(true);
  const revision = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    latest.current = draft;
  });
  const flush = useCallback(
    (snapshot?: Draft) => {
      if (!enabled) return;
      const current = snapshot ?? latest.current;
      const savedRevision = revision.current;
      queue.current = queue.current.catch(() => {}).then(() => saveDraft(current));
      queue.current.then(
        () => {
          if (mounted.current && savedRevision === revision.current)
            setStatus('Черновик на устройстве');
        },
        () => {
          if (mounted.current && savedRevision === revision.current)
            setStatus('Не удалось сохранить. Скачайте проект.');
        },
      );
    },
    [enabled],
  );
  useEffect(() => {
    if (!enabled) return;
    revision.current++;
    setStatus('Сохранение…');
    const timer = setTimeout(() => flush(), 150);
    const hide = () => {
      if (document.hidden) flush();
    };
    const pagehide = () => flush();
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', pagehide);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', pagehide);
    };
  }, [draft, enabled, flush]);
  return { status, flush };
}
