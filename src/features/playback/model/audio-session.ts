/** AudioSession is optional; keep unsupported browsers on ordinary Web Audio. */
export function requestPlaybackSession(): void {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== 'playback') session.type = 'playback';
  } catch {
    // An experimental API may be unavailable even when exposed. The help explains Silent mode.
  }
}
export async function waitForAudioStart(resume: Promise<void>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      resume,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                'Браузер не включил звук. Нажмите «Восстановить звук» или откройте SongKit в Safari.',
              ),
            ),
          3000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
