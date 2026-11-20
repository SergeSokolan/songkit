import { lazy, Suspense, useRef, useState } from 'react';
import type { Pattern } from '../../../entities/drum-pattern';
import { useLanguage } from '../../../shared/i18n';
import './score.css';

const ScorePage = lazy(() => import('./score-page'));

export function ScoreButton({ pattern, bar }: { pattern: Pattern; bar: number }) {
  const english = useLanguage() === 'en';
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        ref={trigger}
        className="secondary-button"
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
      >
        {english ? 'Sheet music' : 'Ноты'}
      </button>
      <dialog
        ref={dialog}
        className="score-dialog"
        aria-label={english ? 'Drum score' : 'Барабанная партитура'}
        onClose={() => {
          setOpen(false);
          if (trigger.current?.getClientRects().length)
            trigger.current.focus({ preventScroll: true });
        }}
      >
        <div className="score-heading">
          <h2>{english ? 'Drum score' : 'Барабанная партитура'}</h2>
          <button className="secondary-button" onClick={() => dialog.current?.close()}>
            {english ? 'Back to grid' : 'К сетке'}
          </button>
        </div>
        {open && (
          <Suspense fallback={<p role="status">{english ? 'Loading score…' : 'Загрузка нот…'}</p>}>
            <ScorePage pattern={pattern} initialBar={bar} />
          </Suspense>
        )}
      </dialog>
    </>
  );
}
