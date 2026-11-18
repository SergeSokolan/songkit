import type { MouseEventHandler } from 'react';
import { useLanguage } from '../../../shared/i18n';
import { Icon } from '../../../shared/ui/icon';
import { welcomeCopy } from '../copy';
import './welcome-page.css';

type WelcomePageProps = {
  editorHref: string;
  guideHref: string;
  onEditor?: MouseEventHandler<HTMLAnchorElement>;
  onGuide?: MouseEventHandler<HTMLAnchorElement>;
};

const previewTracks = [
  { instrument: 'hat', steps: '10101011' },
  { instrument: 'snare', steps: '00100010' },
  { instrument: 'kick', steps: '10011000' },
] as const;

export function WelcomePage({ editorHref, guideHref, onEditor, onGuide }: WelcomePageProps) {
  const copy = welcomeCopy[useLanguage()];

  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <span className="welcome-version">v{import.meta.env.VITE_APP_VERSION ?? 'dev'}</span>
        <a className="github-link" href="https://github.com/SergeSokolan/songkit">
          <Icon name="github" size={17} />
          GitHub
        </a>
      </header>
      <main>
        <div className="welcome-hero">
          <div>
            <div className="welcome-brand">
              <span className="brand-mark" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              SongKit
            </div>
            <h1>{copy.title}</h1>
            <p className="welcome-summary">
              {copy.summary} {copy.library}
            </p>
            <div className="welcome-actions">
              <a className="welcome-primary" href={editorHref} onClick={onEditor}>
                {copy.openEditor}
                <span aria-hidden="true">→</span>
              </a>
              <a className="welcome-guide" href={guideHref} onClick={onGuide}>
                {copy.installationGuide}
              </a>
            </div>
          </div>
          <div className="welcome-preview" aria-hidden="true">
            {previewTracks.map(({ instrument, steps }) => (
              <div className={`welcome-track welcome-track-${instrument}`} key={instrument}>
                <Icon name={instrument} />
                {Array.from(steps, (step, index) => (
                  <span
                    className={step === '1' ? 'welcome-step welcome-step-hit' : 'welcome-step'}
                    key={index}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="welcome-details">
          <p>{copy.files}</p>
          <p>
            {copy.localData} {copy.offline}
          </p>
        </div>
      </main>
    </div>
  );
}
