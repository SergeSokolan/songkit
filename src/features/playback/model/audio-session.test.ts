import { afterEach, describe, it, expect, vi } from 'vitest';
import { requestPlaybackSession } from './audio-session';
afterEach(() => vi.unstubAllGlobals());
describe('optional playback routing', () => {
  it('does nothing on browsers without Audio Session support', () => {
    vi.stubGlobal('navigator', {});
    expect(() => requestPlaybackSession()).not.toThrow();
  });
  it('does not reconfigure an already configured playback session', () => {
    const write = vi.fn();
    vi.stubGlobal('navigator', {
      audioSession: {
        get type() {
          return 'playback';
        },
        set type(value: string) {
          write(value);
        },
      },
    });
    requestPlaybackSession();
    expect(write).not.toHaveBeenCalled();
  });
  it('keeps ordinary audio available if an experimental session setter throws', () => {
    vi.stubGlobal('navigator', {
      audioSession: {
        get type() {
          return 'auto';
        },
        set type(_value: string) {
          throw new Error('NotSupportedError');
        },
      },
    });
    expect(() => requestPlaybackSession()).not.toThrow();
  });
});
