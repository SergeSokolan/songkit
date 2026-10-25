import { afterEach, describe, expect, it, vi } from 'vitest';
import { DrumAudio } from './drum-audio';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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
    expect(context.resume).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(3);
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
        return { addEventListener: vi.fn(), resume: vi.fn().mockResolvedValue(undefined) };
      }),
    );
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', fetch);
    const audio = new DrumAudio();
    await expect(audio.prepare()).rejects.toThrow('загрузить звуки');
    await expect(audio.prepare()).rejects.toThrow('загрузить звуки');
    expect(fetch).toHaveBeenCalledTimes(6);
  });
});
