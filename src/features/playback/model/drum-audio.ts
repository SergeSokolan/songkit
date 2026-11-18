import {
  INSTRUMENTS,
  strengthOf,
  type DrumEvent,
  type Instrument,
} from '../../../entities/drum-pattern';
import type { AudioDriver } from './scheduler';
import { requestPlaybackSession, waitForAudioStart } from './audio-session';

const layers = { ghost: 'soft', normal: 'medium', accent: 'hard' } as const;
const referenceVelocity = { ghost: 35, normal: 80, accent: 115 } as const;
type Layer = (typeof layers)[keyof typeof layers];
type Sample = `${Instrument}-${Layer}`;

/** Owns its context; importing this module never touches audio hardware. */
export class DrumAudio implements AudioDriver {
  private context: AudioContext | null = null;
  onSuspend: () => void = () => {};
  private buffers = new Map<Sample, AudioBuffer>();
  private sources = new Set<AudioBufferSourceNode>();
  private loading: Promise<void> | null = null;
  private generation = 0;
  private stateChanged = () => {
    if (this.context && this.context.state !== 'running') this.onSuspend();
  };
  async prepare(): Promise<void> {
    if (typeof globalThis.AudioContext !== 'function') {
      throw new Error(
        'В этом браузере недоступно воспроизведение. Откройте SongKit в Safari на iPhone или современном Chrome.',
      );
    }
    // Synchronous and inside the user's gesture, before AudioContext creation/resume.
    requestPlaybackSession();
    if (this.context?.state === 'closed') this.reset();
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.context.addEventListener('statechange', this.stateChanged);
    }
    const context = this.context;
    const generation = this.generation;
    try {
      if (context.state !== 'running') await waitForAudioStart(context.resume());
      if (context.state !== 'running')
        throw new Error('Звук приостановлен системой. Нажмите «Восстановить звук».');
    } catch (error) {
      if (context.state !== 'running') {
        if (this.context === context) this.reset();
        throw error;
      }
    }
    if (this.context !== context)
      throw new Error('Запуск звука отменён. Нажмите «Играть» повторно.');
    this.loading ??= this.load(context, generation).catch((error) => {
      if (this.generation === generation) this.loading = null;
      throw error;
    });
    await this.loading;
    if (this.context !== context)
      throw new Error('Запуск звука отменён. Нажмите «Играть» повторно.');
  }
  private async load(context: AudioContext, generation: number): Promise<void> {
    const loaded = await Promise.all(
      INSTRUMENTS.map(async (instrument) => {
        const instrumentSamples = [];
        for (const layer of Object.values(layers)) {
          if (this.generation !== generation) return instrumentSamples;
          const sample: Sample = `${instrument}-${layer}`;
          const response = await fetch(`${import.meta.env.BASE_URL}sounds/muldjord/${sample}.wav`);
          if (!response.ok) throw new Error('Не удалось загрузить звуки. Проверьте соединение.');
          const buffer = await context.decodeAudioData(await response.arrayBuffer());
          instrumentSamples.push([sample, buffer] as const);
        }
        return instrumentSamples;
      }),
    );
    if (this.generation === generation) this.buffers = new Map(loaded.flat());
  }
  now(): number {
    return this.context?.currentTime ?? 0;
  }
  hit(event: DrumEvent, time: number): void {
    const strength = strengthOf(event.velocity);
    const buffer = this.buffers.get(`${event.instrument}-${layers[strength]}`);
    if (!this.context || !buffer) return;
    const source = this.context.createBufferSource(),
      gain = this.context.createGain();
    source.buffer = buffer;
    // Recorded layers supply most of the dynamic difference. Preserve a small velocity response inside each layer.
    gain.gain.value = 0.32 * Math.pow(event.velocity / referenceVelocity[strength], 0.35);
    source.connect(gain).connect(this.context.destination);
    this.sources.add(source);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      this.sources.delete(source);
    };
    source.start(time);
  }
  preview(event: DrumEvent): void {
    this.hit(event, this.now() + 0.005);
  }
  silence(): void {
    for (const source of this.sources) {
      source.stop();
      source.disconnect();
    }
    this.sources.clear();
  }
  reset(): void {
    this.silence();
    const context = this.context;
    this.context = null;
    this.loading = null;
    this.generation++;
    this.buffers.clear();
    if (context) {
      context.removeEventListener('statechange', this.stateChanged);
      if (context.state !== 'closed') void context.close().catch(() => {});
    }
  }
}
