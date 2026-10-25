import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createPattern, setHit } from '../../../entities/drum-pattern';
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
});
