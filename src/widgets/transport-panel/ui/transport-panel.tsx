import { TempoControl } from './tempo-control';
import { useLanguage } from '../../../shared/i18n';
import { Icon } from '../../../shared/ui/icon';

const copy = {
  ru: {
    playback: 'Воспроизведение',
    meter: 'РАЗМЕР',
    quarterNotes: 'четвертями',
    pause: 'Пауза',
    play: 'Играть',
  },
  en: {
    playback: 'Playback',
    meter: 'METER',
    quarterNotes: 'quarter notes',
    pause: 'Pause',
    play: 'Play',
  },
};

interface Props {
  tempo: number;
  playing: boolean;
  loading: boolean;
  onTempo: (tempo: number) => void;
  onPlay: () => void;
  onPause: () => void;
}
export function TransportPanel({ tempo, playing, loading, onTempo, onPlay, onPause }: Props) {
  const t = copy[useLanguage()];
  return (
    <section className="transport" aria-label={t.playback}>
      <TempoControl tempo={tempo} onTempo={onTempo} />
      <div className="meter">
        <span className="eyebrow">{t.meter}</span>
        <strong>
          4<span>/</span>4
        </strong>
        <span className="muted small">{t.quarterNotes}</span>
      </div>
      <div className="transport-actions">
        <button
          className="play-button"
          onClick={playing ? onPause : onPlay}
          disabled={loading}
          aria-label={playing ? t.pause : t.play}
          aria-busy={loading}
        >
          <Icon name={playing ? 'pause' : 'play'} size={25} />
        </button>
      </div>
    </section>
  );
}
