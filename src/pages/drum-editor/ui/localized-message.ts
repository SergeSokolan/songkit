import type { Language } from '../../../shared/i18n';

// Translate errors and statuses at the UI boundary so switching language also updates existing notices.
const englishMessages = new Map([
  ['Новая партия. Очистку нот можно отменить.', 'New pattern. You can undo clearing the hits.'],
  ['Проект открыт.', 'Project opened.'],
  [
    'Проект открыт. Автосохранение заблокировано: старый черновик сохранён для восстановления.',
    'Project opened. Autosave is paused to keep your previous draft available for recovery.',
  ],
  ['Файл больше 1 МБ', 'The file exceeds 1 MB'],
  ['Файл не удалось прочитать как JSON', 'The file could not be read as JSON'],
  ['Неверный файл проекта', 'Invalid project file'],
  ['Неподдерживаемый формат проекта', 'Unsupported project format'],
  ['Неверный набор инструментов', 'Invalid instrument list'],
  ['Слишком много ударов', 'Too many hits'],
  ['Неверный удар', 'Invalid hit'],
  ['Неверные параметры удара', 'Invalid hit settings'],
  ['Повторяющиеся удары', 'Duplicate hits'],
  ['Неверный черновик', 'Invalid draft'],
  ['Неизвестная версия черновика', 'Unsupported draft version'],
  ['Неверное состояние редактора', 'Invalid editor state'],
  ['Хранилище недоступно', 'Storage is unavailable'],
  ['Закройте другую вкладку SongKit и повторите', 'Close the other SongKit tab and try again'],
  ['Сохранение…', 'Saving…'],
  ['Черновик на устройстве', 'Draft saved on this device'],
  [
    'Черновик изменён в другой вкладке. Скачайте проект и перезагрузите страницу.',
    'The draft changed in another tab. Download your project and reload this page.',
  ],
  ['Не удалось сохранить. Скачайте проект.', 'Could not save. Download the project.'],
  [
    'Автосохранение недоступно. Скачайте проект перед обновлением.',
    'Autosave is unavailable. Download your project before updating.',
  ],
  [
    'Не удалось сохранить черновик. Скачайте проект и попробуйте ещё раз.',
    'Could not save the draft. Download your project and try again.',
  ],
  [
    'Обновление пока недоступно. Подключитесь к интернету и попробуйте ещё раз.',
    'The update is unavailable. Connect to the internet and try again.',
  ],
  [
    'Эта версия больше недоступна. Попробуйте обновиться ещё раз.',
    'This version is no longer available. Try updating again.',
  ],
  [
    'Не удалось активировать обновление. Попробуйте ещё раз.',
    'Could not activate the update. Try again.',
  ],
  [
    'В этом браузере недоступно воспроизведение. Откройте SongKit в Safari на iPhone или современном Chrome.',
    'Audio playback is unavailable in this browser. Try Safari on iPhone or an up-to-date Chrome browser.',
  ],
  [
    'Звук приостановлен системой. Нажмите «Восстановить звук».',
    'Audio was suspended. Select Restore sound.',
  ],
  [
    'Запуск звука отменён. Нажмите «Играть» повторно.',
    'Playback was interrupted. Press Play again.',
  ],
  [
    'Не удалось загрузить звуки. Проверьте соединение.',
    'Could not load sounds. Check your connection.',
  ],
  [
    'Браузер не включил звук. Нажмите «Восстановить звук» или откройте SongKit в Safari.',
    'The browser could not start audio. Select Restore sound or open SongKit in Safari.',
  ],
]);

export function localizedMessage(language: Language, message: string, fallback: string) {
  return language === 'ru' ? message : (englishMessages.get(message) ?? fallback);
}
