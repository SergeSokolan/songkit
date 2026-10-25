import { Icon } from '../../../shared/ui/icon';
interface Props {
  tempo: number;
  playing: boolean;
  loading: boolean;
  onTempo: (tempo: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
}
export function TransportPanel({
  tempo,
  playing,
  loading,
  onTempo,
  onPlay,
  onPause,
  onReset,
}: Props) {
  return (
    <section className="transport" aria-label="Воспроизведение">
      <div className="tempo-control">
        <span className="eyebrow">ТЕМП</span>
        <div className="tempo-value">
          <input
            aria-label="Темп BPM"
            type="number"
            min="40"
            max="240"
            value={tempo}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (Number.isInteger(value) && value >= 40 && value <= 240) onTempo(value);
            }}
          />
          <span>BPM</span>
        </div>
        <input
          aria-label="Скорость"
          type="range"
          min="40"
          max="240"
          value={tempo}
          onChange={(e) => onTempo(Number(e.target.value))}
        />
      </div>
      <div className="meter">
        <span className="eyebrow">РАЗМЕР</span>
        <strong>
          4<span>/</span>4
        </strong>
        <span className="muted small">четвертями</span>
      </div>
      <div className="transport-actions">
        <button
          className="play-button"
          onClick={playing ? onPause : onPlay}
          disabled={loading}
          aria-label={playing ? 'Пауза' : 'Играть'}
        >
          <Icon name={playing ? 'pause' : 'play'} size={25} />
          <span>{loading ? 'Готовим звук…' : playing ? 'Пауза' : 'Играть'}</span>
        </button>
        <button
          className="icon-button reset-button"
          aria-label="В начало"
          title="В начало"
          onClick={onReset}
        >
          <Icon name="stop" />
        </button>
      </div>
    </section>
  );
}
