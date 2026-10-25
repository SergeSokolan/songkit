interface Props {
  loading: boolean;
  tested: boolean;
  onCheck: () => void;
}
export function AudioHelp({ loading, tested, onCheck }: Props) {
  const appleMobile =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return (
    <div className="audio-support">
      {appleMobile && (
        <p className="iphone-audio-hint">
          Если на iPhone нет звука, проверьте беззвучный режим и громкость медиа.
        </p>
      )}
      <details className="audio-help">
        <summary>Нет звука?</summary>
        <div className="audio-help-content">
          <p>
            Проверьте громкость медиа и выход звука: динамик, наушники или Bluetooth. На iPhone
            попробуйте отключить беззвучный режим боковым переключателем.
          </p>
          <button className="secondary-button" onClick={onCheck} disabled={loading}>
            {loading ? 'Включаем звук…' : 'Восстановить звук'}
          </button>
          <p className="small muted">
            Кнопка заново включает звук и запускает короткий тест бочки, малого и хэта. Ваша партия
            сохраняется.
          </p>
          {tested && (
            <p role="status">
              Проверочный звук запущен. Если по-прежнему тихо, проверьте громкость и откройте сайт
              прямо в Safari.
            </p>
          )}
          <a
            href="https://sergesokolan.github.io/songkit/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Открыть сайт в браузере ↗
          </a>
        </div>
      </details>
    </div>
  );
}
