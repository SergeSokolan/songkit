import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  createPattern,
  addInstrument,
  INSTRUMENTS,
  BASE_INSTRUMENTS,
} from '../../../entities/drum-pattern';
import { InstrumentPicker } from './instrument-picker';
afterEach(cleanup);
describe('instrument picker', () => {
  it('offers only optional instruments and inserts the selected instrument', () => {
    const onAdd = vi.fn();
    const { rerender } = render(
      <InstrumentPicker instruments={[...BASE_INSTRUMENTS]} onAdd={onAdd} />,
    );
    const select = screen.getByRole('combobox', { name: 'Добавить инструмент' });
    expect(screen.queryByRole('option', { name: 'Бочка' })).toBeNull();
    fireEvent.change(select, { target: { value: 'tom2' } });
    expect(onAdd).toHaveBeenCalledExactlyOnceWith('tom2');
    rerender(
      <InstrumentPicker
        instruments={addInstrument(createPattern(), 'tom2').instruments}
        onAdd={onAdd}
      />,
    );
    expect(screen.queryByRole('option', { name: 'Том 2' })).toBeNull();
  });
  it('shows a complete kit without offering duplicate tracks', () => {
    render(<InstrumentPicker instruments={[...INSTRUMENTS]} onAdd={vi.fn()} />);
    expect(screen.getByText('Установка собрана')).toBeVisible();
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});
