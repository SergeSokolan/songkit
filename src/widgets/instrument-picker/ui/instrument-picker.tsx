import { INSTRUMENTS, INSTRUMENT_DETAILS, type Instrument } from '../../../entities/drum-pattern';
import { Icon } from '../../../shared/ui/icon';
export function InstrumentPicker({
  instruments,
  onAdd,
}: {
  instruments: Instrument[];
  onAdd: (instrument: Instrument) => void;
}) {
  const available = INSTRUMENTS.filter((instrument) => !instruments.includes(instrument));
  return (
    <div className="kit-toolbar">
      <span className="kit-count">Инструменты · {instruments.length}</span>
      {available.length > 0 ? (
        <label className="instrument-picker">
          <Icon name="plus" size={16} />
          <select
            aria-label="Добавить инструмент"
            value=""
            onChange={(e) => onAdd(e.target.value as Instrument)}
          >
            <option value="" disabled>
              Добавить инструмент
            </option>
            {available.map((instrument) => (
              <option key={instrument} value={instrument}>
                {INSTRUMENT_DETAILS[instrument].name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className="kit-complete">Установка собрана</span>
      )}
    </div>
  );
}
