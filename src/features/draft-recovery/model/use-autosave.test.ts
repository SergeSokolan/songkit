import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { createPattern, defaultView } from '../../../entities/drum-pattern';
import { useAutosave } from './use-autosave';
import { saveDraft } from './storage';
vi.mock('./storage', () => ({ saveDraft: vi.fn().mockResolvedValue(undefined) }));
const draft = { schemaVersion: 1 as const, pattern: createPattern(), view: defaultView };
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(saveDraft).mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe('autosave lifecycle', () => {
  it('debounces edits but flushes the newest lifecycle position in order', async () => {
    const { result, rerender } = renderHook(({ value }) => useAutosave(value, true), {
      initialProps: { value: draft },
    });
    rerender({ value: { ...draft, pattern: { ...draft.pattern, tempo: 120 } } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(saveDraft).toHaveBeenCalledExactlyOnceWith({
      ...draft,
      pattern: { ...draft.pattern, tempo: 120 },
    });
    await act(async () => {
      result.current.flush({ ...draft, view: { ...defaultView, position: 120 } });
    });
    expect(vi.mocked(saveDraft).mock.calls.at(-1)?.[0].view.position).toBe(120);
    expect(result.current.status).toBe('Черновик на устройстве');
  });
  it('does not overwrite a draft when recovery disabled saving', async () => {
    const { result } = renderHook(() => useAutosave(draft, false));
    await act(async () => {
      result.current.flush();
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(saveDraft).not.toHaveBeenCalled();
  });
  it('reports failure and retries on the next flush', async () => {
    vi.mocked(saveDraft).mockRejectedValueOnce(new Error('QuotaExceeded'));
    const { result } = renderHook(() => useAutosave(draft, true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(result.current.status).toContain('Не удалось сохранить');
    await act(async () => {
      result.current.flush();
    });
    expect(result.current.status).toBe('Черновик на устройстве');
  });
});
