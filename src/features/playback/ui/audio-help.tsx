import { useLanguage } from '../../../shared/i18n';

const copy = {
  ru: {
    iphone: 'Если на iPhone нет звука, проверьте беззвучный режим и громкость медиа.',
    title: 'Нет звука?',
    instructions:
      'Проверьте громкость медиа и выход звука: динамик, наушники или Bluetooth. На iPhone попробуйте отключить беззвучный режим боковым переключателем.',
    loading: 'Включаем звук…',
    restore: 'Восстановить звук',
    testExplanation:
      'Кнопка заново включает звук и запускает короткий тест бочки, малого и хэта. Ваша партия сохраняется.',
    testStarted:
      'Проверочный звук запущен. Если по-прежнему тихо, проверьте громкость и откройте сайт прямо в Safari.',
    openBrowser: 'Открыть сайт в браузере ↗',
  },
  en: {
    iphone: 'If you hear no sound on iPhone, check Silent Mode and the media volume.',
    title: 'No sound?',
    instructions:
      'Check the media volume and where sound is playing: your speaker, headphones, or a Bluetooth device. On iPhone, try turning off Silent Mode with the side switch.',
    loading: 'Turning on sound…',
    restore: 'Restore sound',
    testExplanation:
      'This button turns sound back on and plays a short kick, snare, and hi-hat test. Your pattern is preserved.',
    testStarted:
      'The test sound has started. If you still hear nothing, check the volume and open the site directly in Safari.',
    openBrowser: 'Open site in browser ↗',
  },
};

interface Props {
  loading: boolean;
  tested: boolean;
  onCheck: () => void;
}
export function AudioHelp({ loading, tested, onCheck }: Props) {
  const t = copy[useLanguage()];
  const appleMobile =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return (
    <div className="audio-support">
      {appleMobile && <p className="iphone-audio-hint">{t.iphone}</p>}
      <details className="audio-help">
        <summary>{t.title}</summary>
        <div className="audio-help-content">
          <p>{t.instructions}</p>
          <button className="secondary-button" onClick={onCheck} disabled={loading}>
            {loading ? t.loading : t.restore}
          </button>
          <p className="small muted">{t.testExplanation}</p>
          {tested && <p role="status">{t.testStarted}</p>}
          <a
            href="https://sergesokolan.github.io/songkit/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.openBrowser}
          </a>
        </div>
      </details>
    </div>
  );
}
