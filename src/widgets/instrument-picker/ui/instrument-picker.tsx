import { INSTRUMENTS, INSTRUMENT_DETAILS, type Instrument } from '../../../entities/drum-pattern';
import { instrumentName, useLanguage } from '../../../shared/i18n';
import { Icon } from '../../../shared/ui/icon';

const copy = {
  ru: {
    instruments: 'Инструменты',
    add: 'Добавить инструмент',
    choose: 'Выбрать',
    complete: 'Установка собрана',
  },
  en: {
    instruments: 'Instruments',
    add: 'Add instrument',
    choose: 'Choose',
    complete: 'Kit complete',
  },
};

export function InstrumentPicker({
  instruments,
  onAdd,
}: {
  instruments: Instrument[];
  onAdd: (instrument: Instrument) => void;
}) {
  const language = useLanguage();
  const t = copy[language];
  const available = INSTRUMENTS.filter((instrument) => !instruments.includes(instrument));
  return (
    <div className="kit-toolbar">
      <span className="kit-count">
        {t.instruments} · {instruments.length}
      </span>
      {available.length > 0 ? (
        <label className="instrument-picker">
          <span>{t.add}</span>
          <Icon name="plus" size={16} />
          <select aria-label={t.add} value="" onChange={(e) => onAdd(e.target.value as Instrument)}>
            <option value="" disabled>
              {t.choose}
            </option>
            {available.map((instrument) => (
              <option key={instrument} value={instrument}>
                {instrumentName(language, instrument, INSTRUMENT_DETAILS[instrument].name)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className="kit-complete">{t.complete}</span>
      )}
    </div>
  );
}
