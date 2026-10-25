import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { demoPattern } from '../../../entities/drum-pattern';
import { usePlayback } from './use-playback';
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('audio recovery lifecycle', () => {
  it('replaces the audio context, plays a test, keeps the groove and cleans up on unmount', async () => {
    const contexts: {
      close: ReturnType<typeof vi.fn>;
      createBufferSource: ReturnType<typeof vi.fn>;
    }[] = [];
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        const context = {
          state: 'running',
          currentTime: 1,
          destination: {},
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          close: vi.fn().mockResolvedValue(undefined),
          resume: vi.fn().mockResolvedValue(undefined),
          decodeAudioData: vi.fn().mockResolvedValue({}),
          createBufferSource: vi.fn(() => ({
            connect: vi.fn().mockReturnValue({ connect: vi.fn() }),
            disconnect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            buffer: null,
            onended: null,
          })),
          createGain: vi.fn(() => ({ gain: { value: 0 }, disconnect: vi.fn() })),
        };
        contexts.push(context);
        return context;
      }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
    );
    const pattern = demoPattern(),
      snapshot = JSON.stringify(pattern),
      onPause = vi.fn();
    const { result, unmount } = renderHook(() => usePlayback(pattern, 0, onPause));
    expect(contexts).toHaveLength(0);
    await act(async () => {
      await result.current.play();
    });
    expect(result.current.playing).toBe(true);
    expect(contexts).toHaveLength(1);
    await act(async () => {
      await result.current.checkSound();
    });
    expect(result.current.playing).toBe(false);
    expect(result.current.soundTested).toBe(true);
    expect(contexts).toHaveLength(2);
    expect(contexts[0].close).toHaveBeenCalledOnce();
    expect(contexts[1].createBufferSource).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(pattern)).toBe(snapshot);
    expect(onPause).toHaveBeenCalled();
    const sources = contexts[1].createBufferSource.mock.results.map((r) => r.value);
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    for (const source of sources) expect(source.stop).toHaveBeenCalled();
    unmount();
    expect(contexts[1].close).toHaveBeenCalledOnce();
  });
  it('shows audio errors when testing sound without a supported audio API', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const { result } = renderHook(() => usePlayback(demoPattern(), 0, vi.fn()));
    await act(async () => {
      await result.current.checkSound();
    });
    expect(result.current.error).toContain('недоступно воспроизведение');
    expect(result.current.loading).toBe(false);
    expect(result.current.soundTested).toBe(false);
  });
});
