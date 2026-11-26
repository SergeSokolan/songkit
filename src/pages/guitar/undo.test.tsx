import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Guitar } from './index';
vi.mock('../../features/guitar-draft', () => ({
  loadLoop: () => Promise.resolve({ loop: null, conflict: false }),
  saveLoop: () => Promise.resolve(null),
}));
it('keeps only the latest 100 undo steps for a guitar session', async () => {
  render(<Guitar />);
  const tempo = await screen.findByLabelText('Темп');
  for (let i = 0; i < 101; i++)
    fireEvent.change(tempo, { target: { value: i % 2 ? '122' : '121' } });
  for (let i = 0; i < 100; i++)
    fireEvent.click(screen.getByRole('button', { name: 'Отменить правку' }));
  expect(tempo).toHaveValue('121');
  expect(screen.queryByRole('button', { name: 'Отменить правку' })).not.toBeInTheDocument();
}, 15000);
