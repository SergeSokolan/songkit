import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallation() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent>();
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia('(display-mode: standalone), (display-mode: window-controls-overlay)')
        .matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
  );

  useEffect(() => {
    const offer = (event: Event) => {
      if (!('prompt' in event) || typeof event.prompt !== 'function') return;
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const accept = () => {
      setInstalled(true);
      setPromptEvent(undefined);
    };
    window.addEventListener('beforeinstallprompt', offer);
    window.addEventListener('appinstalled', accept);
    return () => {
      window.removeEventListener('beforeinstallprompt', offer);
      window.removeEventListener('appinstalled', accept);
    };
  }, []);

  const install =
    promptEvent && !installed
      ? () => {
          setPromptEvent(undefined);
          void promptEvent.prompt().catch(() => {
            // Keep the manual instructions available if the browser rejects the prompt.
          });
        }
      : undefined;

  return { installed, install };
}
