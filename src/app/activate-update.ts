export async function activateUpdate(): Promise<void> {
  const serviceWorker = navigator.serviceWorker;
  const registration = await serviceWorker.getRegistration();
  const waiting = registration?.waiting;
  if (!waiting) {
    if (registration?.active && serviceWorker.controller !== registration.active) {
      window.location.reload();
      return;
    }
    throw new Error('Обновление пока недоступно. Подключитесь к интернету и попробуйте ещё раз.');
  }

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      waiting.removeEventListener('statechange', changed);
    };
    const changed = () => {
      if (waiting.state === 'activated') {
        cleanup();
        resolve();
      } else if (waiting.state === 'redundant') {
        cleanup();
        reject(new Error('Эта версия больше недоступна. Попробуйте обновиться ещё раз.'));
      }
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Не удалось активировать обновление. Попробуйте ещё раз.'));
    }, 10000);
    waiting.addEventListener('statechange', changed);
    try {
      waiting.postMessage({ type: 'SKIP_WAITING' });
      changed();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
  window.location.reload();
}
