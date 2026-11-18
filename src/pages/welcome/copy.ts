export const welcomeCopy = {
  ru: {
    title: 'Барабанная мастерская',
    summary: 'Нажимайте на клетки, чтобы расставить удары, и слушайте свой ритм.',
    library: 'Выберите готовый ритм в библиотеке и добавьте брейк.',
    files:
      'Скачайте MIDI для музыкального редактора или JSON, чтобы открыть проект в SongKit на другом устройстве.',
    localData:
      'Партия остаётся в браузере и не отправляется на сервер. Очистка данных сайта может удалить черновик.',
    offline: 'После полной загрузки редактор работает без интернета.',
    openEditor: 'Открыть редактор',
    installationGuide: 'Инструкция по установке',
  },
  en: {
    title: 'Drum workshop',
    summary: 'Tap the grid to place drum hits, then play your beat.',
    library: 'Pick a groove from the library and add a drum fill.',
    files:
      'Download MIDI for your music editor or save a JSON project you can open in SongKit on another device.',
    localData: 'Your pattern stays in this browser. Clearing site data can delete the local draft.',
    offline: 'Once fully loaded, the editor works offline.',
    openEditor: 'Open editor',
    installationGuide: 'Installation guide',
  },
} as const;
