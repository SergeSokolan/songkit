import { useEffect, useId, useRef, useState } from 'react';
import {
  INSTRUMENT_DETAILS,
  displayInstruments,
  type Pattern,
} from '../../../entities/drum-pattern';
import { instrumentName, useLanguage } from '../../../shared/i18n';
import { engrave, scoreFont } from './engrave';

export default function ScorePage({
  pattern,
  initialBar,
}: {
  pattern: Pattern;
  initialBar: number;
}) {
  const language = useLanguage();
  const english = language === 'en';
  const [bar, setBar] = useState(initialBar);
  const [failed, setFailed] = useState(false);
  const staff = useRef<HTMLDivElement>(null);
  const label = useId();
  const activeBar = Math.min(bar, pattern.barCount - 1);

  useEffect(() => {
    let active = true;
    const container = staff.current!;
    setFailed(false);
    scoreFont
      .then(() => {
        if (active) engrave(container, pattern, activeBar);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      container.replaceChildren();
    };
  }, [pattern, activeBar]);

  return (
    <>
      <div className="score-tools">
        <label htmlFor={label}>{english ? 'Bar' : 'Такт'}</label>
        <select
          id={label}
          value={activeBar}
          onChange={(event) => setBar(Number(event.target.value))}
        >
          {Array.from({ length: pattern.barCount }, (_, index) => (
            <option value={index} key={index}>
              {index + 1}
            </option>
          ))}
        </select>
        <span>{pattern.tempo} BPM · 4/4</span>
      </div>
      {failed && (
        <p role="alert">
          {english ? 'The score could not be drawn.' : 'Не удалось отобразить ноты.'}
        </p>
      )}
      <div
        className="score-paper"
        role="region"
        aria-label={english ? `Notation for bar ${activeBar + 1}` : `Ноты такта ${activeBar + 1}`}
        tabIndex={0}
      >
        <div className="score-staff" aria-hidden="true" ref={staff} />
      </div>
      <details className="score-legend">
        <summary>{english ? 'Notation key' : 'Условные обозначения'}</summary>
        <p>
          {english ? 'Instruments from top to bottom:' : 'Инструменты сверху вниз:'}{' '}
          {displayInstruments(pattern)
            .map((instrument) =>
              instrumentName(language, instrument, INSTRUMENT_DETAILS[instrument].name),
            )
            .join(' · ')}
        </p>
        <p>
          {english
            ? 'Parentheses mark ghost notes, > marks an accent, and 3 marks a triplet.'
            : 'Скобки обозначают тихий удар, > — акцент, 3 — триоль.'}
        </p>
      </details>
    </>
  );
}
