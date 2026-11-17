import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createPattern } from '../../../entities/drum-pattern';
import { FillPanel } from './fill-panel';
afterEach(cleanup);
it('shows preview actions only in the panel owning the active candidate', () => {
  const props = {
    pattern: createPattern(),
    bar: 0,
    onPreview: vi.fn(),
    onApply: vi.fn(),
    onCancel: vi.fn(),
    previewing: true,
  };
  const { rerender } = render(<FillPanel {...props} />);
  fireEvent.click(screen.getByText('Брейки · библиотека и предложения'));
  fireEvent.click(screen.getByText('Дополнительно: генератор и произвольный участок'));
  const advanced = within(screen.getByRole('region', { name: 'Брейки' }));
  const actions = ['Применить брейк', 'Отменить предпросмотр'];
  fireEvent.click(screen.getByRole('button', { name: 'Предпросмотр: Малый восьмыми' }));
  const catalogId = props.onPreview.mock.calls.at(-1)![0].id;
  rerender(<FillPanel {...props} activeId={catalogId} />);
  for (const name of actions) {
    expect(screen.getAllByRole('button', { name })).toHaveLength(1);
    expect(advanced.queryByRole('button', { name })).toBeNull();
  }
  for (const candidate of ['Свободнее · Редкий', 'Малый восьмыми · Простой']) {
    fireEvent.click(advanced.getByRole('button', { name: candidate }));
    const activeId = props.onPreview.mock.calls.at(-1)![0].id;
    rerender(<FillPanel {...props} activeId={activeId} />);
    for (const name of actions) {
      expect(screen.getAllByRole('button', { name })).toHaveLength(1);
      expect(advanced.getByRole('button', { name })).toBeVisible();
    }
  }
  rerender(<FillPanel {...props} activeId="groove-other" />);
  for (const name of actions) expect(screen.queryByRole('button', { name })).toBeNull();
});
