import { TempoControl } from './tempo-control';
import { Icon } from '../../../shared/ui/icon';
interface Props {
  tempo: number;
  playing: boolean;
  loading: boolean;
  onTempo: (tempo: number) => void;
  onPlay: () => void;
  onPause: () => void;
}
export function TransportPanel({ tempo, playing, loading, onTempo, onPlay, onPause }: Props) {
  return (
    <section className="transport" aria-label="Воспроизведение">
      <TempoControl tempo={tempo} onTempo={onTempo} />
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
          aria-busy={loading}
        >
          <Icon name={playing ? 'pause' : 'play'} size={25} />
        </button>
      </div>
    </section>
  );
}
