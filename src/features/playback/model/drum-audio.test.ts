import { afterEach, describe, expect, it, vi } from 'vitest';
import { DrumAudio } from './drum-audio';
const mocks = vi.hoisted(() => ({
  start: vi.fn().mockResolvedValue(undefined),
  getContext: vi.fn(),
}));
vi.mock('tone', () => mocks);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe('audio adapter', () => {
  it('explains an unavailable audio API without touching the network', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(new DrumAudio().prepare()).rejects.toThrow('недоступно воспроизведение');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('loads local sounds once, schedules gain and stops pending sources', async () => {
    vi.stubGlobal('AudioContext', class {});
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
      decodeAudioData: vi.fn().mockResolvedValue({}),
      createBufferSource: () => source,
      createGain: () => gain,
      addEventListener: vi.fn(),
    };
    mocks.getContext.mockReturnValue({ rawContext: context });
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    vi.stubGlobal('fetch', fetch);
    const audio = new DrumAudio();
    await audio.prepare();
    await audio.prepare();
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
  it('reports sample fetch failure and allows retry', async () => {
    vi.stubGlobal('AudioContext', class {});
    mocks.getContext.mockReturnValue({ rawContext: { addEventListener: vi.fn() } });
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', fetch);
    const audio = new DrumAudio();
    await expect(audio.prepare()).rejects.toThrow('загрузить звуки');
    await expect(audio.prepare()).rejects.toThrow('загрузить звуки');
    expect(fetch).toHaveBeenCalledTimes(6);
  });
});
