import { INSTRUMENTS, type DrumEvent, type Instrument } from '../../../entities/drum-pattern';
import type { AudioDriver } from './scheduler';
/** Owns its context; importing this module never touches audio hardware. */
export class DrumAudio implements AudioDriver {
  private context: AudioContext | null = null;
  onSuspend: () => void = () => {};
  private buffers = new Map<Instrument, AudioBuffer>();
  private sources = new Set<AudioBufferSourceNode>();
  private loading: Promise<void> | null = null;
  async prepare(): Promise<void> {
    if (typeof globalThis.AudioContext !== 'function') {
      throw new Error(
        'В этом браузере недоступно воспроизведение. Откройте SongKit в Safari на iPhone или современном Chrome.',
      );
    }
    if (!this.context) {
      const context = new AudioContext({ latencyHint: 'interactive' });
      context.addEventListener('statechange', () => {
        if (context.state !== 'running') this.onSuspend();
      });
      this.context = context;
    }
    await this.context.resume();
    this.loading ??= this.load().catch((error) => {
      this.loading = null;
      throw error;
    });
    await this.loading;
  }
  private async load(): Promise<void> {
    const context = this.context!;
    await Promise.all(
      INSTRUMENTS.map(async (instrument) => {
        const response = await fetch(`${import.meta.env.BASE_URL}sounds/${instrument}.wav`);
        if (!response.ok) throw new Error('Не удалось загрузить звуки. Проверьте соединение.');
        this.buffers.set(instrument, await context.decodeAudioData(await response.arrayBuffer()));
      }),
    );
  }
  now(): number {
    return this.context?.currentTime ?? 0;
  }
  hit(event: DrumEvent, time: number): void {
    const buffer = this.buffers.get(event.instrument);
    if (!this.context || !buffer) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    gain.gain.value = Math.pow(event.velocity / 127, 1.4) * 0.8;
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
}
