import { INSTRUMENTS, type DrumEvent, type Instrument } from '../../../entities/drum-pattern';
import type { AudioDriver } from './scheduler';
import { requestPlaybackSession, waitForAudioStart } from './audio-session';
/** Owns its context; importing this module never touches audio hardware. */
export class DrumAudio implements AudioDriver {
  private context: AudioContext | null = null;
  onSuspend: () => void = () => {};
  private buffers = new Map<Instrument, AudioBuffer>();
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
    await Promise.all(
      INSTRUMENTS.map(async (instrument) => {
        const response = await fetch(`${import.meta.env.BASE_URL}sounds/${instrument}.wav`);
        if (!response.ok) throw new Error('Не удалось загрузить звуки. Проверьте соединение.');
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        if (this.generation === generation) this.buffers.set(instrument, buffer);
      }),
    );
  }
  now(): number {
    return this.context?.currentTime ?? 0;
  }
  hit(event: DrumEvent, time: number): void {
    const buffer = this.buffers.get(event.instrument);
    if (!this.context || !buffer) return;
    const source = this.context.createBufferSource(),
      gain = this.context.createGain();
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
