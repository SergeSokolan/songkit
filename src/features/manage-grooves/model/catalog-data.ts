// Original educational adaptations, version 1.
export const GROOVE_CATALOG = [
  {
    id: 'rock-basic',
    name: 'Простой рок',
    style: 'rock',
    description: 'Хэт восьмыми; бочка на 1/3, малый на 2/4.',
    feel: 'Ровные восьмые',
    density: 'Простой',
    events: [
      {
        instrument: 'hat',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 480,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1440,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2400,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 3360,
        velocity: 80,
      },
    ],
  },
  {
    id: 'rock-push',
    name: 'Рок с подводящей бочкой',
    style: 'rock',
    description: 'Бочка на слабой восьмой перед четвёртой долей.',
    feel: 'Ровные восьмые',
    density: 'Простой',
    events: [
      {
        instrument: 'hat',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 480,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1440,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2400,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 2400,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 3360,
        velocity: 80,
      },
    ],
  },
  {
    id: 'rock-half',
    name: 'Рок half-time',
    style: 'rock',
    description: 'Малый только на третьей доле.',
    feel: 'Ровные восьмые',
    density: 'Простой',
    events: [
      {
        instrument: 'hat',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 480,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1440,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1440,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2400,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 3360,
        velocity: 80,
      },
    ],
  },
  {
    id: 'metal-heavy',
    name: 'Тяжёлый backbeat',
    style: 'metal',
    description: 'Бочка парами, малый на 2/4.',
    feel: 'Ровные шестнадцатые',
    density: 'Средний',
    events: [
      {
        instrument: 'hat',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 240,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 2160,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 2880,
        velocity: 80,
      },
    ],
  },
  {
    id: 'metal-double',
    name: 'Ровная двойная бочка',
    style: 'metal',
    description: '16 ударов бочки за такт; одна дорожка kick.',
    feel: 'Ровные шестнадцатые',
    density: 'Средний',
    events: [
      {
        instrument: 'hat',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 240,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 480,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 480,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 720,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1200,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1440,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1440,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1680,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 2160,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2400,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 2400,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 2640,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 3120,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 3360,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 3360,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 3600,
        velocity: 80,
      },
    ],
  },
  {
    id: 'metal-bursts',
    name: 'Двойная бочка группами',
    style: 'metal',
    description: 'Четыре удара, пауза; повтор со третьей доли.',
    feel: 'Ровные шестнадцатые',
    density: 'Средний',
    events: [
      {
        instrument: 'hat',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 240,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 480,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 480,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 720,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1440,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 2160,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2400,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 2400,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 2640,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 3360,
        velocity: 80,
      },
    ],
  },
  {
    id: 'pop-basic',
    name: 'Поп backbeat',
    style: 'pop',
    description: 'Лёгкий хэт и опорные удары 2/4.',
    feel: 'Ровные восьмые',
    density: 'Простой',
    events: [
      {
        instrument: 'hat',
        tick: 0,
        velocity: 65,
      },
      {
        instrument: 'kick',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 480,
        velocity: 65,
      },
      {
        instrument: 'hat',
        tick: 960,
        velocity: 65,
      },
      {
        instrument: 'snare',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1440,
        velocity: 65,
      },
      {
        instrument: 'hat',
        tick: 1920,
        velocity: 65,
      },
      {
        instrument: 'kick',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2400,
        velocity: 65,
      },
      {
        instrument: 'hat',
        tick: 2880,
        velocity: 65,
      },
      {
        instrument: 'snare',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 3360,
        velocity: 65,
      },
    ],
  },
  {
    id: 'pop-four',
    name: 'Бочка на каждую долю',
    style: 'pop',
    description: 'Четыре опоры бочки.',
    feel: 'Ровные восьмые',
    density: 'Простой',
    events: [
      {
        instrument: 'hat',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 480,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1440,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2400,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 3360,
        velocity: 80,
      },
    ],
  },
  {
    id: 'pop-half',
    name: 'Разреженный поп',
    style: 'pop',
    description: 'Четверти на хэте, малый на 3.',
    feel: 'Ровные четверти',
    density: 'Простой',
    events: [
      {
        instrument: 'hat',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 2400,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2880,
        velocity: 80,
      },
    ],
  },
  {
    id: 'funk-sync',
    name: 'Синкопированная бочка',
    style: 'funk',
    description: 'Слабые шестнадцатые бочки между опорами малого.',
    feel: 'Ровные шестнадцатые',
    density: 'Простой',
    events: [
      {
        instrument: 'hat',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 480,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 720,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1440,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1680,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2400,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 2400,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 3360,
        velocity: 80,
      },
    ],
  },
  {
    id: 'funk-ghost',
    name: 'Фанк с тихим малым',
    style: 'funk',
    description: 'Тихие удары между опорными 2/4.',
    feel: 'Ровные шестнадцатые',
    density: 'Простой',
    events: [
      {
        instrument: 'hat',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 480,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 720,
        velocity: 35,
      },
      {
        instrument: 'hat',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1440,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1680,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 2160,
        velocity: 35,
      },
      {
        instrument: 'hat',
        tick: 2400,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 3120,
        velocity: 35,
      },
      {
        instrument: 'hat',
        tick: 3360,
        velocity: 80,
      },
    ],
  },
  {
    id: 'funk-linear',
    name: 'Линейный грув',
    style: 'funk',
    description: 'Инструменты чередуются без одновременных ударов.',
    feel: 'Ровные шестнадцатые',
    density: 'Простой',
    events: [
      {
        instrument: 'kick',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 240,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 480,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 720,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1200,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1440,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 1680,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2160,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 2400,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 2640,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 3120,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 3360,
        velocity: 80,
      },
      {
        instrument: 'hat',
        tick: 3600,
        velocity: 80,
      },
    ],
  },
  {
    id: 'jazz-swing',
    name: 'Райд: обычный свинг',
    style: 'jazz',
    description: 'Четверти и поздний ответ после 2/4.',
    feel: 'Длинная / короткая · 2:1',
    density: 'Простой',
    events: [
      {
        instrument: 'kick',
        tick: 0,
        velocity: 35,
      },
      {
        instrument: 'ride',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'ride',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 960,
        velocity: 55,
      },
      {
        instrument: 'ride',
        tick: 1600,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1920,
        velocity: 35,
      },
      {
        instrument: 'ride',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'ride',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 2880,
        velocity: 55,
      },
      {
        instrument: 'ride',
        tick: 3520,
        velocity: 80,
      },
    ],
  },
  {
    id: 'jazz-comp',
    name: 'Свинг с ответом малого',
    style: 'jazz',
    description: 'Райд сохраняет рисунок; малый отвечает между долями.',
    feel: 'Длинная / короткая · 2:1',
    density: 'Простой',
    events: [
      {
        instrument: 'kick',
        tick: 0,
        velocity: 35,
      },
      {
        instrument: 'ride',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 640,
        velocity: 55,
      },
      {
        instrument: 'ride',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'ride',
        tick: 1600,
        velocity: 80,
      },
      {
        instrument: 'ride',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 2560,
        velocity: 55,
      },
      {
        instrument: 'ride',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'ride',
        tick: 3520,
        velocity: 80,
      },
    ],
  },
  {
    id: 'jazz-reverse',
    name: 'Райд: обратный свинг',
    style: 'jazz',
    description: 'Учебный вариант: ответ после 2/4 раньше, на первой трети.',
    feel: 'Короткая / длинная · 1:2',
    density: 'Простой',
    events: [
      {
        instrument: 'kick',
        tick: 0,
        velocity: 35,
      },
      {
        instrument: 'ride',
        tick: 0,
        velocity: 80,
      },
      {
        instrument: 'ride',
        tick: 960,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 960,
        velocity: 55,
      },
      {
        instrument: 'ride',
        tick: 1280,
        velocity: 80,
      },
      {
        instrument: 'kick',
        tick: 1920,
        velocity: 35,
      },
      {
        instrument: 'ride',
        tick: 1920,
        velocity: 80,
      },
      {
        instrument: 'ride',
        tick: 2880,
        velocity: 80,
      },
      {
        instrument: 'snare',
        tick: 2880,
        velocity: 55,
      },
      {
        instrument: 'ride',
        tick: 3200,
        velocity: 80,
      },
    ],
  },
] as const;
