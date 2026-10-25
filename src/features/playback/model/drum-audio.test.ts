import { afterEach, describe, expect, it, vi } from 'vitest';
import { DrumAudio } from './drum-audio';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe('audio adapter', () => {
  it('does not construct an audio context before a user requests sound', () => {
    const constructor = vi.fn();
    vi.stubGlobal('AudioContext', constructor);
    const audio = new DrumAudio();
    expect(constructor).not.toHaveBeenCalled();
    expect(audio.now()).toBe(0);
    audio.silence();
  });
  it('explains an unavailable audio API without touching the network', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(new DrumAudio().prepare()).rejects.toThrow('недоступно воспроизведение');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('loads sounds once, resumes a single context, schedules gain and stops sources', async () => {
    const source = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      onended: null as null | (() => void),
    };
    const gain = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
    source.connect.mockReturnValue(gain);
    const context = {
      currentTime: 1,
      state: 'running',
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      decodeAudioData: vi.fn().mockResolvedValue({}),
      createBufferSource: () => source,
      createGain: () => gain,
      addEventListener: vi.fn(),
    };
    const constructor = vi.fn(function () {
      return context;
    });
    vi.stubGlobal('AudioContext', constructor);
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    vi.stubGlobal('fetch', fetch);
    const audio = new DrumAudio();
    await audio.prepare();
    await audio.prepare();
    expect(constructor).toHaveBeenCalledExactlyOnceWith({ latencyHint: 'interactive' });
    expect(context.resume).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(9);
    expect(audio.now()).toBe(1);
    audio.preview({ id: 'snare:0', instrument: 'snare', tick: 0, velocity: 35 });
    expect(source.start).toHaveBeenCalledWith(1.005);
    expect(gain.gain.value).toBeLessThan(0.2);
    audio.silence();
    expect(source.stop).toHaveBeenCalledOnce();
    source.onended?.();
    expect(gain.disconnect).toHaveBeenCalledOnce();
    const suspended = vi.fn();
    audio.onSuspend = suspended;
    context.state = 'suspended';
    context.addEventListener.mock.calls[0][1]();
    expect(suspended).toHaveBeenCalledOnce();
  });
  it('reports fetch failure and allows retry', async () => {
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        return {
          state: 'running',
          addEventListener: vi.fn(),
          resume: vi.fn().mockResolvedValue(undefined),
        };
      }),
    );
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', fetch);
    const audio = new DrumAudio();
    await expect(audio.prepare()).rejects.toThrow('загрузить звуки');
    await expect(audio.prepare()).rejects.toThrow('загрузить звуки');
    expect(fetch).toHaveBeenCalledTimes(18);
  });

  it('requests the playback session synchronously before constructing or resuming audio', async () => {
    const order: string[] = [];
    let type = 'auto';
    vi.stubGlobal('navigator', {
      audioSession: {
        get type() {
          return type;
        },
        set type(value: string) {
          type = value;
          order.push('session');
        },
      },
    });
    const context = {
      state: 'suspended',
      currentTime: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn(async () => {
        order.push('resume');
        context.state = 'running';
      }),
      decodeAudioData: vi.fn().mockResolvedValue({}),
    };
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        order.push('context');
        return context;
      }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
    );
    await new DrumAudio().prepare();
    expect(type).toBe('playback');
    expect(order).toEqual(['session', 'context', 'resume']);
  });
  it('times out a stuck resume so the user can retry instead of remaining on loading', async () => {
    vi.useFakeTimers();
    const context = {
      state: 'suspended',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn(() => new Promise<void>(() => {})),
    };
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        return context;
      }),
    );
    const audio = new DrumAudio();
    const pending = expect(audio.prepare()).rejects.toThrow('Восстановить звук');
    await vi.advanceTimersByTimeAsync(3100);
    await pending;
    expect(context.close).toHaveBeenCalledOnce();
  });

  it('does not reset a context that another gesture has already resumed', async () => {
    vi.useFakeTimers();
    const context = {
      state: 'suspended',
      currentTime: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn(() => new Promise<void>(() => {})),
      decodeAudioData: vi.fn().mockResolvedValue({}),
    };
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        return context;
      }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
    );
    const audio = new DrumAudio(),
      first = expect(audio.prepare()).resolves.toBeUndefined();
    context.state = 'running';
    await audio.prepare();
    await vi.advanceTimersByTimeAsync(3100);
    await first;
    expect(context.close).not.toHaveBeenCalled();
    expect(audio.now()).toBe(1);
  });
  it('rejects a resume that resolves without activating the context', async () => {
    const context = {
      state: 'suspended',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn().mockResolvedValue(undefined),
    };
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        return context;
      }),
    );
    await expect(new DrumAudio().prepare()).rejects.toThrow('Восстановить звук');
    expect(context.close).toHaveBeenCalledOnce();
  });
  it('recreates a closed context on the next user gesture', async () => {
    const contexts = [0, 1].map((i) => ({
      state: 'running',
      currentTime: i + 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn(),
      decodeAudioData: vi.fn().mockResolvedValue({}),
    }));
    let i = 0;
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        return contexts[i++];
      }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
    );
    const audio = new DrumAudio();
    await audio.prepare();
    contexts[0].state = 'closed';
    await audio.prepare();
    expect(audio.now()).toBe(2);
    expect(contexts[0].close).not.toHaveBeenCalled();
  });
});
