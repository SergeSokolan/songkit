import { requestPlaybackSession, waitForAudioStart } from './audio-session';

/** The page owns one unlocked context. Each transport run gets a separately disposable output. */
export class GuitarAudio {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private run = 0;
  private interrupted: (() => void) | null = null;
  private stateChanged = () => {
    if (this.output && this.context?.state !== 'running') this.interrupted?.();
  };

  async prepare(onInterrupt: () => void) {
    this.stop();
    const run = this.run;
    requestPlaybackSession();
    const Context =
      globalThis.AudioContext ??
      (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Context) throw new Error('Web Audio unavailable');
    if (!this.context || this.context.state === 'closed') {
      this.context = new Context({ latencyHint: 'interactive' });
      this.context.addEventListener('statechange', this.stateChanged);
    }
    const context = this.context;
    try {
      if (context.state !== 'running') await waitForAudioStart(context.resume());
      if (run !== this.run) return null;
      if (context.state !== 'running') throw new Error('Audio suspended');
      const output = context.createGain();
      output.connect(context.destination);
      this.output = output;
      this.interrupted = onInterrupt;
      return { context, output };
    } catch (err) {
      if (run !== this.run) return null;
      this.dispose();
      throw err;
    }
  }

  stop() {
    this.run++;
    this.interrupted = null;
    this.output?.disconnect();
    this.output = null;
  }

  dispose() {
    this.stop();
    const context = this.context;
    this.context = null;
    if (context) {
      context.removeEventListener('statechange', this.stateChanged);
      if (context.state !== 'closed') void context.close().catch(() => {});
    }
  }
}
