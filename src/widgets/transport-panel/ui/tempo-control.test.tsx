import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { useState } from 'react';
import { TempoControl } from './tempo-control';
function Fixture({ initial = 100 }: { initial?: number }) {
  const [tempo, setTempo] = useState(initial);
  return <TempoControl tempo={tempo} onTempo={setTempo} />;
}
beforeEach(() => {
  vi.useFakeTimers();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  HTMLElement.prototype.scrollTo = vi.fn();
  HTMLElement.prototype.setPointerCapture = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it('steps by one, clamps at boundaries and supports keyboard clicks', () => {
  render(<Fixture initial={40} />);
  expect(screen.getByRole('button', { name: 'Уменьшить темп' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Увеличить темп' }));
  expect(screen.getByLabelText('Темп BPM')).toHaveValue(41);
  fireEvent.change(screen.getByLabelText('Темп BPM'), { target: { value: '240' } });
  expect(screen.getByRole('button', { name: 'Увеличить темп' })).toBeDisabled();
});
it('repeats only while held and cancels timers on pointer cancellation or blur', () => {
  render(<Fixture />);
  const plus = screen.getByRole('button', { name: 'Увеличить темп' });
  fireEvent.pointerDown(plus, { button: 0, pointerId: 1 });
  act(() => vi.advanceTimersByTime(650));
  expect(Number((screen.getByLabelText('Темп BPM') as HTMLInputElement).value)).toBeGreaterThan(
    101,
  );
  fireEvent.pointerCancel(plus);
  const before = (screen.getByLabelText('Темп BPM') as HTMLInputElement).value;
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByLabelText('Темп BPM')).toHaveValue(Number(before));
  fireEvent.pointerDown(plus, { button: 0, pointerId: 2 });
  fireEvent.blur(window);
  const after = (screen.getByLabelText('Темп BPM') as HTMLInputElement).value;
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByLabelText('Темп BPM')).toHaveValue(Number(after));
});
it('keeps wheel draft separate until confirmation, supports arrows and cancellation', () => {
  render(<Fixture />);
  fireEvent.click(screen.getByRole('button', { name: 'Выбрать темп барабаном' }));
  fireEvent.change(screen.getByLabelText('Новое значение BPM'), { target: { value: '150' } });
  expect(screen.getByLabelText('Темп BPM')).toHaveValue(100);
  fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
  expect(screen.getByLabelText('Темп BPM')).toHaveValue(100);
  fireEvent.click(screen.getByRole('button', { name: 'Выбрать темп барабаном' }));
  fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });
  fireEvent.click(screen.getByRole('button', { name: 'Готово' }));
  expect(screen.getByLabelText('Темп BPM')).toHaveValue(101);
});
