import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AudioHelp } from './audio-help';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe('sound help', () => {
  it('shows an honest Silent-mode hint on iPhone and provides a recovery action', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)',
    );
    const onCheck = vi.fn();
    render(<AudioHelp loading={false} tested={false} onCheck={onCheck} />);
    expect(
      screen.getByText('Если на iPhone нет звука, проверьте беззвучный режим и громкость медиа.'),
    ).toBeVisible();
    fireEvent.click(screen.getByText('Нет звука?'));
    fireEvent.click(screen.getByRole('button', { name: 'Восстановить звук' }));
    expect(onCheck).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: /Открыть сайт/ })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
  });
  it('does not claim a successful audible result after scheduling the test', () => {
    render(<AudioHelp loading={false} tested onCheck={vi.fn()} />);
    fireEvent.click(screen.getByText('Нет звука?'));
    expect(screen.getByRole('status')).toHaveTextContent('Проверочный звук запущен');
    expect(screen.getByRole('status')).toHaveTextContent('Если по-прежнему тихо');
  });
});
