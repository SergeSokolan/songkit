import { useId, useState, type MouseEventHandler } from 'react';
import { useLanguage } from '../../../shared/i18n';
import { browserOptions, copy, sources } from './copy';
import styles from './installation-guide.module.css';

type InstallationGuideProps = {
  editorHref: string;
  welcomeHref: string;
  onEditor: MouseEventHandler<HTMLAnchorElement>;
  onWelcome: MouseEventHandler<HTMLAnchorElement>;
  install?: () => void;
  installed: boolean;
};

export function InstallationGuide({
  editorHref,
  welcomeHref,
  onEditor,
  onWelcome,
  install,
  installed,
}: InstallationGuideProps) {
  const text = copy[useLanguage()];
  const selectorId = useId();
  const labelId = useId();
  const instructionsId = useId();
  const [selection, setSelection] = useState('');
  const browserOption = browserOptions.find((option) => option === selection);
  const browser = browserOption ? text.browsers[browserOption] : undefined;
  const links = browserOption ? sources[browserOption] : [];

  return (
    <main className={styles.guide}>
      <h1 tabIndex={-1}>{text.title}</h1>
      <p className={styles.introduction}>{text.introduction}</p>
      <div className={styles.installActions}>
        {installed && <p role="status">{text.installed}</p>}
        {install && !installed && (
          <button type="button" className={styles.primary} onClick={install}>
            {text.install}
          </button>
        )}
      </div>
      <section className={styles.panel} aria-labelledby={labelId}>
        <div className={styles.chooser}>
          <label id={labelId} htmlFor={selectorId}>
            {text.browser}
          </label>
          <select
            id={selectorId}
            value={selection}
            aria-controls={instructionsId}
            onChange={(event) => setSelection(event.target.value)}
          >
            <option value="">{text.choose}</option>
            {browserOptions.map((option) => (
              <option key={option} value={option}>
                {text.browsers[option].label}
              </option>
            ))}
          </select>
        </div>
        <div id={instructionsId} aria-live="polite">
          {browser?.introduction && <p className={styles.note}>{browser.introduction}</p>}
          {browser?.steps && (
            <ol className={styles.steps}>
              {browser.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
          {browser?.note && <p className={styles.note}>{browser.note}</p>}
        </div>
        {links.length > 0 && (
          <p className={styles.sources}>
            <span>{text.source}</span>
            {links.map(({ label, href }) => (
              <a key={href} href={href} aria-label={`${text.source} · ${label}`}>
                {label}
              </a>
            ))}
          </p>
        )}
      </section>
      <div className={styles.navigation}>
        <a className={styles.editor} href={editorHref} onClick={onEditor}>
          {text.editor}
        </a>
        <a href={welcomeHref} onClick={onWelcome}>
          {text.welcome}
        </a>
      </div>
    </main>
  );
}
