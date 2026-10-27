import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  addInstrument,
  createPattern,
  INSTRUMENTS,
  resizePattern,
  setHit,
} from '../../../entities/drum-pattern';
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
  it('explicit editor selects ghost velocity without toggling the hit', () => {
    const p = props();
    render(<DrumGrid {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Изменить / перенести удар' }));
    fireEvent.click(screen.getByRole('button', { name: 'Малый, такт 1, шаг 2, пусто' }));
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

  it('holding does not open a sheet and scrolling never edits', () => {
    vi.useFakeTimers();
    const p = props();
    render(<DrumGrid {...p} />);
    const cell = screen.getByRole('button', { name: 'Малый, такт 1, шаг 2, пусто' });
    fireEvent.pointerDown(cell, { button: 0, pointerType: 'touch', clientX: 20, clientY: 20 });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.contextMenu(cell);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.pointerMove(cell, { pointerType: 'touch', clientX: 60, clientY: 20 });
    fireEvent.pointerUp(cell);
    fireEvent.click(cell);
    expect(p.onHit).not.toHaveBeenCalled();
  });
  it('cycles normal to ghost and imported accent to normal', () => {
    const p = props();
    p.pattern = setHit(p.pattern, 'snare', 0, 80);
    const { rerender } = render(<DrumGrid {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Малый, такт 1, шаг 1, Обычный' }));
    expect(p.onHit).toHaveBeenLastCalledWith('snare', 0, 35);
    p.pattern = setHit(p.pattern, 'snare', 0, 115);
    rerender(<DrumGrid {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Малый, такт 1, шаг 1, Акцент' }));
    expect(p.onHit).toHaveBeenLastCalledWith('snare', 0, 80);
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
      'Том 1',
      'Том 2',
      'Том 3',
      'Малый',
      'Бочка',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Крэш 2, такт 1, шаг 1, пусто' }));
    expect(p.onHit).toHaveBeenCalledExactlyOnceWith('crash2', 0, 80);
  });

  it('counts only off-grid hits in the current bar and keeps boundary hits visible', () => {
    const p = props();
    p.pattern = resizePattern(p.pattern, 2);
    for (const tick of [0, 120, 240, 360, 480, 3960])
      p.pattern = setHit(p.pattern, 'snare', tick, 80);
    render(<DrumGrid {...p} />);
    const first = screen.getByRole('button', {
      name: 'Малый, такт 1, шаг 1, Обычный, есть удары между делениями',
    });
    expect(first).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: 'Малый, такт 1, шаг 2, Обычный' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
