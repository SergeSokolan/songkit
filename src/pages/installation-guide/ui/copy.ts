import type { Language } from '../../../shared/i18n';

export const sources = {
  safariIos: [
    { label: 'iPhone', href: 'https://support.apple.com/en-hk/guide/iphone/iphea86e5236/ios' },
    { label: 'iPad', href: 'https://support.apple.com/en-kw/guide/ipad/ipad8f1f7a29/ipados' },
  ],
  safariMac: [{ label: 'Apple', href: 'https://support.apple.com/104996' }],
  chromeDesktop: [{ label: 'Google', href: 'https://support.google.com/chrome/answer/9658361' }],
  chromeAndroid: [
    {
      label: 'Google',
      href: 'https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid',
    },
  ],
  edgeDesktop: [
    {
      label: 'Microsoft',
      href: 'https://support.microsoft.com/en-US/edge/install-manage-or-uninstall-apps-in-microsoft-edge',
    },
  ],
  firefoxWindows: [
    { label: 'Mozilla', href: 'https://support.mozilla.org/kb/web-apps-firefox-windows' },
  ],
  firefoxAndroid: [
    { label: 'Mozilla', href: 'https://support.mozilla.org/kb/use-web-apps-firefox-android' },
  ],
  other: [],
};

export const browserOptions = Object.keys(sources) as BrowserOption[];
type BrowserOption = keyof typeof sources;

type BrowserCopy = {
  label: string;
  introduction?: string;
  steps?: string[];
  note?: string;
};

type GuideCopy = {
  title: string;
  introduction: string;
  browser: string;
  choose: string;
  install: string;
  installed: string;
  source: string;
  welcome: string;
  editor: string;
  browsers: Record<BrowserOption, BrowserCopy>;
};

export const copy: Record<Language, GuideCopy> = {
  en: {
    title: 'Install SongKit',
    introduction: 'Add SongKit to your device for quick access, or keep using it in your browser.',
    browser: 'Browser and device',
    choose: 'Choose a browser',
    install: 'Install',
    installed: 'SongKit is already installed.',
    source: 'Official instructions',
    welcome: 'About SongKit',
    editor: 'Open editor',
    browsers: {
      safariIos: {
        label: 'Safari — iPhone / iPad',
        steps: [
          'Open SongKit in Safari. Tap Share, or open the page menu and tap Share.',
          'Tap Add to Home Screen. On iPad, tap View More first if needed.',
          'Turn on Open as Web App if offered, then tap Add.',
        ],
      },
      safariMac: {
        label: 'Safari — Mac',
        steps: [
          'Open SongKit in Safari on macOS Sonoma 14 or later.',
          'Choose File → Add to Dock. You can also find Add to Dock in the Share menu.',
          'Click Add.',
        ],
      },
      chromeDesktop: {
        label: 'Chrome — computer',
        steps: [
          'Open SongKit in Chrome.',
          'Click the install icon in the address bar if it appears. You can also use ⋮ → Cast, save, and share → Install page as app.',
          'Follow the prompts to install SongKit.',
        ],
      },
      chromeAndroid: {
        label: 'Chrome — Android',
        steps: [
          'Open SongKit in Chrome.',
          'Open the ⋮ menu. Tap Install and create shortcut or Add to Home screen, depending on your Chrome version.',
          'Choose Install and follow the prompts.',
        ],
      },
      edgeDesktop: {
        label: 'Microsoft Edge — computer',
        steps: [
          'Open SongKit in Edge.',
          'Click the install icon in the address bar if it appears. You can also use … → More tools → Apps → Install this site as an app.',
          'Confirm the installation.',
        ],
      },
      firefoxWindows: {
        label: 'Firefox — Windows',
        steps: [
          'Open SongKit in Firefox 143 or later. The Microsoft Store edition requires Firefox 150 or later.',
          'Click the web apps icon in the address bar. Find SongKit in the Windows Start menu.',
        ],
        note: 'If the icon is missing, you can use SongKit in a tab or install it with Chrome. On a Mac, you can also use Safari to install it.',
      },
      firefoxAndroid: {
        label: 'Firefox — Android',
        steps: [
          'Open SongKit in Firefox and tap the ⋮ menu.',
          'Tap Install and follow the prompts to add SongKit to your home screen.',
        ],
      },
      other: {
        label: 'Arc, Brave, Opera, or another browser',
        introduction:
          'If your browser offers an install command in its menu or address bar, use it. You can also keep using SongKit in a tab.',
        note: 'In Chrome on a computer, for example, open SongKit and select ⋮ → Cast, save, and share → Install page as app. For mobile steps, choose Safari for iPhone or iPad, or Chrome for Android in the list above.',
      },
    },
  },
  ru: {
    title: 'Установка SongKit',
    introduction: 'Добавьте SongKit на устройство для быстрого доступа или работайте в браузере.',
    browser: 'Браузер и устройство',
    choose: 'Выберите браузер',
    install: 'Установить',
    installed: 'SongKit уже установлен.',
    source: 'Официальная инструкция',
    welcome: 'О SongKit',
    editor: 'Открыть редактор',
    browsers: {
      safariIos: {
        label: 'Safari — iPhone / iPad',
        steps: [
          'Откройте SongKit в Safari. Нажмите «Поделиться» или найдите этот пункт в меню страницы.',
          'Выберите «На экран „Домой“». На iPad при необходимости сначала нажмите «Показать ещё».',
          'Включите «Открыть как веб-приложение», если появился такой переключатель, и нажмите «Добавить».',
        ],
      },
      safariMac: {
        label: 'Safari — Mac',
        steps: [
          'Откройте SongKit в Safari на macOS Sonoma 14 или новее.',
          'Выберите «Файл» → «Добавить в Dock». Эта команда также есть в меню «Поделиться».',
          'Нажмите «Добавить».',
        ],
      },
      chromeDesktop: {
        label: 'Chrome — компьютер',
        steps: [
          'Откройте SongKit в Chrome.',
          'Нажмите значок установки в адресной строке, если он появился. Или выберите ⋮ → «Транслировать, сохранить, поделиться» → «Установить страницу как приложение».',
          'Следуйте подсказкам Chrome, чтобы установить SongKit.',
        ],
      },
      chromeAndroid: {
        label: 'Chrome — Android',
        steps: [
          'Откройте SongKit в Chrome.',
          'Откройте меню ⋮. В зависимости от версии Chrome выберите «Установить и создать ярлык» или «Добавить на главный экран».',
          'Нажмите «Установить» и следуйте подсказкам.',
        ],
      },
      edgeDesktop: {
        label: 'Microsoft Edge — компьютер',
        steps: [
          'Откройте SongKit в Edge.',
          'Нажмите значок установки в адресной строке, если он появился. Или выберите … → «Другие инструменты» → «Приложения» → «Установить этот сайт как приложение».',
          'Подтвердите установку.',
        ],
      },
      firefoxWindows: {
        label: 'Firefox — Windows',
        steps: [
          'Откройте SongKit в Firefox 143 или новее. Для версии из Microsoft Store нужен Firefox 150 или новее.',
          'Нажмите значок веб-приложения в адресной строке. SongKit появится в меню Windows «Пуск».',
        ],
        note: 'Если значка нет, можно пользоваться SongKit во вкладке или установить его через Chrome. На Mac для установки также подойдёт Safari.',
      },
      firefoxAndroid: {
        label: 'Firefox — Android',
        steps: [
          'Откройте SongKit в Firefox и нажмите ⋮.',
          'Выберите «Установить» и следуйте подсказкам, чтобы добавить SongKit на главный экран.',
        ],
      },
      other: {
        label: 'Arc, Brave, Opera или другой браузер',
        introduction:
          'Если в меню браузера или адресной строке есть команда установки, воспользуйтесь ею. SongKit также работает во вкладке браузера.',
        note: 'Например, на компьютере откройте SongKit в Chrome и выберите ⋮ → «Транслировать, сохранить, поделиться» → «Установить страницу как приложение». Для телефона или планшета выберите в списке выше Safari для iPhone и iPad или Chrome для Android.',
      },
    },
  },
};
