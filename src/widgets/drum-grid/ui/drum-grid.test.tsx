import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { addInstrument, createPattern, INSTRUMENTS, setHit } from '../../../entities/drum-pattern';
import { DrumGrid } from './drum-grid';
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe('drum grid interactions', () => {
  const props = () => ({
    pattern: createPattern(),
    bar: 0,
    grid: 8 as const,
    position: 0,
    playing: false,
    scrollLeft: 0,
    onScroll: vi.fn(),
    onHit: vi.fn(),
    onMove: vi.fn(),
  });
  it('toggles hits using accessible controls', () => {
    const p = props();
    render(<DrumGrid {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Бочка, такт 1, шаг 1, пусто' }));
    expect(p.onHit).toHaveBeenCalledWith('kick', 0, 80);
  });
  it('removes an existing hit', () => {
    const p = props();
    p.pattern = setHit(p.pattern, 'snare', 0, 35);
    render(<DrumGrid {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Малый, такт 1, шаг 1, Тихий' }));
    expect(p.onHit).toHaveBeenCalledWith('snare', 0, null);
  });
  it('context menu selects ghost velocity without toggling the hit', () => {
    const p = props();
    render(<DrumGrid {...p} />);
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Малый, такт 1, шаг 2, пусто' }));
    fireEvent.click(screen.getByRole('button', { name: 'Тихий, сила 35' }));
    expect(p.onHit).toHaveBeenCalledExactlyOnceWith('snare', 480, 35);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('allows touch-friendly movement and retains fine notes on coarse grids', () => {
    const p = props();
    p.pattern = setHit(p.pattern, 'snare', 120, 35);
    render(<DrumGrid {...p} />);
    expect(
      screen.getByRole('button', { name: /Малый, такт 1, шаг 1, пусто, есть удары/ }),
    ).toBeTruthy();
  });

  it('long press opens dynamics and suppresses the following toggle', () => {
    vi.useFakeTimers();
    const p = props();
    render(<DrumGrid {...p} />);
    const cell = screen.getByRole('button', { name: 'Малый, такт 1, шаг 2, пусто' });
    fireEvent.pointerDown(cell, { button: 0, pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(screen.getByRole('dialog', { name: 'Сила удара' })).toBeVisible();
    fireEvent.click(cell);
    expect(p.onHit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Тихий, сила 35' }));
    expect(p.onHit).toHaveBeenCalledExactlyOnceWith('snare', 480, 35);
  });

  it('displays the base kit bottom-up and inserts optional instruments at their height', () => {
    const p = props();
    const { container, rerender } = render(<DrumGrid {...p} />);
    const labels = () =>
      Array.from(container.querySelectorAll('.track-label strong')).map((el) => el.textContent);
    expect(labels()).toEqual(['Хай-хэт', 'Малый', 'Бочка']);
    for (const instrument of [...INSTRUMENTS].reverse())
      p.pattern = addInstrument(p.pattern, instrument);
    rerender(<DrumGrid {...p} />);
    expect(labels()).toEqual([
      'Крэш 2',
      'Крэш 1',
      'Райд',
      'Хай-хэт',
      'Том 3',
      'Том 2',
      'Том 1',
      'Малый',
      'Бочка',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Крэш 2, такт 1, шаг 1, пусто' }));
    expect(p.onHit).toHaveBeenCalledExactlyOnceWith('crash2', 0, 80);
  });
});
