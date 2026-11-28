import { useCallback, useEffect, useRef, useState } from 'react';
import type { Draft } from '../../../entities/drum-pattern';
import { saveDraft } from './storage';
import { DraftConflict } from '../../../shared/lib/draft-store';

export function useAutosave(draft: Draft, enabled: boolean, initial: Draft | null = null) {
  const expected = useRef<Draft | null | 'recovery'>(enabled ? initial : 'recovery');
  const [status, setStatus] = useState('Сохранение…');
  const queue = useRef(Promise.resolve());
  const latest = useRef(draft);
  const saved = useRef<Draft | null>(initial ? draft : null);
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
      queue.current = queue.current
        .catch(() => {})
        .then(async () => {
          await saveDraft(current, expected.current);
          expected.current = current;
        });
      queue.current.then(
        () => {
          saved.current = current;
          if (mounted.current && savedRevision === revision.current)
            setStatus('Черновик на устройстве');
        },
        (error) => {
          if (mounted.current && savedRevision === revision.current)
            setStatus(
              error instanceof DraftConflict
                ? 'Черновик изменён в другой вкладке. Скачайте проект и перезагрузите страницу.'
                : 'Не удалось сохранить. Скачайте проект.',
            );
        },
      );
      return queue.current;
    },
    [enabled],
  );
  useEffect(() => {
    if (!enabled) return;
    revision.current++;
    const changed = draft !== saved.current;
    setStatus(changed ? 'Сохранение…' : 'Черновик на устройстве');
    const timer = changed ? setTimeout(() => flush(), 150) : undefined;
    const pagehide = () => {
      if (latest.current !== saved.current) void flush();
    };
    const hide = () => {
      if (document.hidden) pagehide();
    };
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
