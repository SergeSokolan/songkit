import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TempoControl } from './tempo-control';
function Fixture({ initial = 100 }: { initial?: number }) {
  const [tempo, setTempo] = useState(initial);
  return <TempoControl tempo={tempo} onTempo={setTempo} />;
}
beforeEach(() => {
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
  const main = screen.getByLabelText('Темп BPM');
  expect(main).toHaveValue('41');
  fireEvent.change(main, { target: { value: '240' } });
  fireEvent.blur(main);
  expect(screen.getByRole('button', { name: 'Увеличить темп' })).toBeDisabled();
});
it('repeats only while held and cancels timers on pointer cancellation or blur', () => {
  vi.useFakeTimers();
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
  expect(screen.getByLabelText('Темп BPM')).toHaveValue(before);
  fireEvent.pointerDown(plus, { button: 0, pointerId: 2 });
  fireEvent.blur(window);
  const after = (screen.getByLabelText('Темп BPM') as HTMLInputElement).value;
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByLabelText('Темп BPM')).toHaveValue(after);
});
it('keeps wheel draft separate until confirmation, supports arrows and cancellation', () => {
  render(<Fixture />);
  fireEvent.click(screen.getByRole('button', { name: 'Выбрать темп барабаном' }));
  fireEvent.change(screen.getByLabelText('Новое значение BPM'), { target: { value: '150' } });
  expect(screen.getByLabelText('Темп BPM')).toHaveValue('100');
  fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
  expect(screen.getByLabelText('Темп BPM')).toHaveValue('100');
  fireEvent.click(screen.getByRole('button', { name: 'Выбрать темп барабаном' }));
  fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });
  fireEvent.click(screen.getByRole('button', { name: 'Готово' }));
  expect(screen.getByLabelText('Темп BPM')).toHaveValue('101');
});

it.each(['90', '40', '239', '240'])(
  'applies %s BPM entered with keys in the main field',
  async (value) => {
    const user = userEvent.setup();
    const onTempo = vi.fn();
    render(<TempoControl tempo={100} onTempo={onTempo} />);
    const main = screen.getByLabelText<HTMLInputElement>('Темп BPM');

    await user.clear(main);
    expect(main.value).toBe('');
    await user.keyboard(value);
    expect(main.value).toBe(value);
    expect(onTempo).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(onTempo).toHaveBeenCalledExactlyOnceWith(Number(value));
  },
);

it.each(['90', '40', '239', '240'])(
  'applies %s BPM entered with keys in the picker',
  async (value) => {
    const user = userEvent.setup();
    const onTempo = vi.fn();
    render(<TempoControl tempo={100} onTempo={onTempo} />);
    await user.click(screen.getByRole('button', { name: 'Выбрать темп барабаном' }));
    const picker = screen.getByLabelText<HTMLInputElement>('Новое значение BPM');
    await user.clear(picker);
    expect(picker.value).toBe('');
    await user.keyboard(value);
    expect(picker.value).toBe(value);
    expect(onTempo).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Готово' }));
    expect(onTempo).toHaveBeenCalledExactlyOnceWith(Number(value));
  },
);

it('preserves the saved tempo after invalid input, makes the error explicit, and allows cancellation', async () => {
  const user = userEvent.setup();
  const onTempo = vi.fn();
  render(<TempoControl tempo={100} onTempo={onTempo} />);
  const main = screen.getByLabelText<HTMLInputElement>('Темп BPM');

  await user.clear(main);
  await user.keyboard('39{Tab}');
  expect(main.value).toBe('100');
  expect(screen.getByRole('status')).toHaveTextContent('40–240');
  expect(onTempo).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Выбрать темп барабаном' }));
  const picker = screen.getByLabelText<HTMLInputElement>('Новое значение BPM');
  await user.clear(picker);
  await user.keyboard('241');
  await user.click(screen.getByRole('button', { name: 'Готово' }));
  expect(picker).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('alert')).toHaveTextContent('40–240');
  expect(onTempo).not.toHaveBeenCalled();

  await user.clear(picker);
  await user.keyboard('90');
  await user.click(screen.getByRole('button', { name: 'Отмена' }));
  expect(main.value).toBe('100');
  expect(onTempo).not.toHaveBeenCalled();
});
