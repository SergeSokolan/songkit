import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
async function startOrCheckUnsupported(page: Page) {
  const supported = await page.evaluate(() => typeof AudioContext === 'function');
  await page.getByRole('button', { name: 'Играть', exact: true }).click();
  if (supported)
    await expect(page.getByRole('button', { name: 'Пауза', exact: true })).toBeVisible();
  else
    await expect(page.getByRole('alert')).toContainText(
      'В этом браузере недоступно воспроизведение',
    );
  return supported;
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { __audioContexts: number };
    state.__audioContexts = 0;
    if (typeof AudioContext === 'function')
      window.AudioContext = new Proxy(AudioContext, {
        construct(target, args) {
          state.__audioContexts++;
          return Reflect.construct(target, args);
        },
      });
  });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Всё начинается/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as typeof window & { __audioContexts: number }).__audioContexts,
    ),
  ).toBe(0);
});
test('edit fine notes, dynamics, undo and restore across reload', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Новая партия', exact: true }).click();
  await page.getByRole('button', { name: '1/32', exact: true }).click();
  await page.getByRole('button', { name: 'Малый, такт 1, шаг 2, пусто', exact: true }).click();
  await page.getByRole('button', { name: 'Малый, такт 1, шаг 2, Обычный', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Малый, такт 1, шаг 2, Тихий', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Малый, такт 1, шаг 2, Обычный', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await page.getByRole('button', { name: '1/8', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /Малый, такт 1, шаг 1, пусто, есть удары/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: '1/32', exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        async () =>
          new Promise<{ velocity: number; grid: number }>((resolve) => {
            const r = indexedDB.open('songkit', 1);
            r.onsuccess = () => {
              const db = r.result,
                tx = db.transaction('drafts'),
                q = tx.objectStore('drafts').get('current');
              q.onsuccess = () => {
                resolve({
                  velocity: q.result?.pattern?.events?.[0]?.velocity ?? 0,
                  grid: q.result?.view?.grid ?? 0,
                });
                db.close();
              };
            };
          }),
      ),
    )
    .toEqual({ velocity: 35, grid: 32 });
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Малый, такт 1, шаг 2, Тихий', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});
test('plays and edits without resetting playback, or explains missing audio API', async ({
  page,
}) => {
  const supported = await startOrCheckUnsupported(page);
  await page.getByRole('button', { name: 'Бочка, такт 1, шаг 2, пусто', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Бочка, такт 1, шаг 2, Обычный', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  if (supported) {
    await expect(page.getByRole('button', { name: 'Пауза', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Играть', exact: true })).toBeVisible();
});
test('offline reload and playback remain local', async ({ page, context }) => {
  await expect(page.getByRole('status').filter({ hasText: 'Доступно офлайн' })).toBeVisible({
    timeout: 30000,
  });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Всё начинается/ })).toBeVisible();
  const supported = await startOrCheckUnsupported(page);
  if (supported) await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  await page.getByRole('button', { name: 'Бочка, такт 1, шаг 2, пусто', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Бочка, такт 1, шаг 2, Обычный', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});
test('MIDI and project download complete as real files', async ({ page }) => {
  for (const [label, name] of [
    ['MIDI', 'songkit.mid'],
    ['Проект', 'songkit.json'],
  ]) {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: label, exact: true }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(name);
    expect(await download.failure()).toBeNull();
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    if (label === 'MIDI') expect(bytes.subarray(0, 4).toString()).toBe('MThd');
    else expect(JSON.parse(bytes.toString()).schemaVersion).toBe(2);
  }
});
test('bar reduction warns, is undoable, and invalid import preserves work', async ({ page }) => {
  await page.getByRole('button', { name: 'Добавить такт' }).click();
  await page.getByRole('button', { name: 'Такт 2', exact: true }).click();
  await page.getByRole('button', { name: 'Бочка, такт 2, шаг 1, пусто', exact: true }).click();
  page.once('dialog', (d) => d.dismiss());
  await page.getByLabel('Количество тактов').selectOption('1');
  await expect(page.getByLabel('Количество тактов')).toHaveValue('2');
  page.once('dialog', (d) => d.accept());
  await page.getByLabel('Количество тактов').selectOption('1');
  await expect(page.getByLabel('Количество тактов')).toHaveValue('1');
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(page.getByLabel('Количество тактов')).toHaveValue('2');
  await page.locator('input[type=file]').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":99}'),
  });
  await expect(
    page.getByRole('status').filter({ hasText: 'Неподдерживаемый формат' }),
  ).toBeVisible();
  await expect(page.getByLabel('Количество тактов')).toHaveValue('2');
});
test('mobile-sized layout keeps page inside viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Играть', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('songkit-mobile.png'), fullPage: true });
});

test('adds the full kit in height order, undoes additions, restores and plays offline', async ({
  page,
  context,
}) => {
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Новая партия', exact: true }).click();
  const labels = () => page.locator('.track-label strong').allTextContents();
  expect(await labels()).toEqual(['Хай-хэт', 'Малый', 'Бочка']);
  await page.getByRole('combobox', { name: 'Добавить инструмент' }).selectOption('tom2');
  await page.getByRole('button', { name: 'Том 2, такт 1, шаг 1, пусто', exact: true }).click();
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  expect(await labels()).toEqual(['Хай-хэт', 'Малый', 'Бочка']);
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  for (const [instrument, name] of [
    ['crash2', 'Крэш 2'],
    ['ride', 'Райд'],
    ['tom1', 'Том 1'],
    ['crash1', 'Крэш 1'],
    ['tom3', 'Том 3'],
  ]) {
    await page.getByRole('combobox', { name: 'Добавить инструмент' }).selectOption(instrument);
    await page.getByRole('button', { name: `${name}, такт 1, шаг 1, пусто`, exact: true }).click();
  }
  const expected = [
    'Крэш 2',
    'Крэш 1',
    'Райд',
    'Хай-хэт',
    'Том 1',
    'Том 2',
    'Том 3',
    'Малый',
    'Бочка',
  ];
  await expect(page.locator('.track-label strong')).toHaveText(expected);
  await expect(page.getByText('Установка собрана')).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Черновик на устройстве' }),
  ).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Доступно офлайн' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.track-label strong')).toHaveText(expected);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Всё начинается/ })).toBeVisible();
  await expect(page.locator('.track-label strong')).toHaveText(expected);
  const samples = await page.evaluate(async () =>
    Promise.all(
      ['kick', 'snare', 'tom1', 'tom2', 'tom3', 'hat', 'ride', 'crash1', 'crash2'].map(
        async (instrument) => {
          const response = await fetch(`sounds/${instrument}.wav`);
          return response.ok && (await response.arrayBuffer()).byteLength > 44;
        },
      ),
    ),
  );
  expect(samples).toEqual(Array(9).fill(true));
  await expect(
    page.getByRole('button', { name: 'Том 2, такт 1, шаг 1, Обычный', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  const supported = await startOrCheckUnsupported(page);
  if (supported) await page.getByRole('button', { name: 'Пауза', exact: true }).click();
});

test('imports a version-one project and preserves its ghost note', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  const old = {
    schemaVersion: 1,
    tempo: 93,
    timeSignature: [4, 4],
    barCount: 1,
    events: [{ id: 'snare:480', instrument: 'snare', tick: 480, velocity: 35 }],
  };
  await page.locator('input[type=file]').setInputFiles({
    name: 'old-songkit.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(old)),
  });
  await expect(
    page.getByRole('button', { name: 'Малый, такт 1, шаг 2, Тихий', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Темп BPM')).toHaveValue('93');
  expect(await page.locator('.track-label strong').allTextContents()).toEqual([
    'Хай-хэт',
    'Малый',
    'Бочка',
  ]);
});

test('adds a cymbal while the loop keeps playing', async ({ page }) => {
  const supported = await startOrCheckUnsupported(page);
  await page.getByRole('combobox', { name: 'Добавить инструмент' }).selectOption('ride');
  await page.getByRole('button', { name: 'Райд, такт 1, шаг 1, пусто', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Райд, такт 1, шаг 1, Обычный', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  if (supported) {
    await expect(page.getByRole('button', { name: 'Пауза', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  }
});

test('shows the GitHub source link and release version', async ({ page }) => {
  const link = page.getByRole('link', { name: 'Исходный код SongKit на GitHub' });
  await expect(link).toHaveAttribute('href', 'https://github.com/SergeSokolan/songkit');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('.app-version')).toHaveText('v0.4.0');
});

test('requests music playback routing and can restore sound without changing the groove', async ({
  page,
}, testInfo) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: { type: 'auto' },
    });
  });
  const notes = await page
    .locator('.step[aria-pressed=true]')
    .evaluateAll((elements) => elements.map((el) => el.getAttribute('aria-label')));
  const supported = await startOrCheckUnsupported(page);
  if (supported) {
    expect(
      await page.evaluate(
        () => (navigator as Navigator & { audioSession: { type: string } }).audioSession.type,
      ),
    ).toBe('playback');
    await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  }
  if (testInfo.project.name === 'webkit-mobile')
    await expect(
      page.getByText('Если на iPhone нет звука, проверьте беззвучный режим и громкость медиа.'),
    ).toBeVisible();
  await page.getByText('Нет звука?', { exact: true }).click();
  await page.getByRole('button', { name: 'Восстановить звук', exact: true }).click();
  if (supported) {
    await expect(
      page.getByRole('status').filter({ hasText: 'Проверочный звук запущен' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => (window as typeof window & { __audioContexts: number }).__audioContexts,
      ),
    ).toBe(2);
  } else await expect(page.getByRole('alert')).toContainText('недоступно воспроизведение');
  expect(
    await page
      .locator('.step[aria-pressed=true]')
      .evaluateAll((elements) => elements.map((el) => el.getAttribute('aria-label'))),
  ).toEqual(notes);
  await expect(page.getByRole('button', { name: 'Играть', exact: true })).toBeEnabled();
});

test('mobile tempo buttons and wheel confirm, cancel and restore offline', async ({
  page,
  context,
}) => {
  await page.getByRole('button', { name: 'Увеличить темп' }).click();
  await expect(page.getByLabel('Темп BPM', { exact: true })).toHaveValue('101');
  await page.getByRole('button', { name: 'Уменьшить темп' }).click();
  await expect(page.getByLabel('Темп BPM', { exact: true })).toHaveValue('100');
  await page.getByRole('button', { name: 'Выбрать темп барабаном' }).click();
  await page.getByLabel('Новое значение BPM').fill('140');
  await expect(page.getByLabel('Новое значение BPM')).toHaveValue('140');
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(page.getByLabel('Темп BPM', { exact: true })).toHaveValue('100');
  await page.getByRole('button', { name: 'Выбрать темп барабаном' }).click();
  const wheel = page.getByRole('listbox', { name: 'Барабан темпа BPM' });
  await wheel.focus();
  await wheel.press('End');
  await expect(page.getByLabel('Новое значение BPM')).toHaveValue('240');
  await page.getByRole('button', { name: 'Готово', exact: true }).click();
  await expect(page.getByLabel('Темп BPM', { exact: true })).toHaveValue('240');
  await expect(page.getByRole('button', { name: 'Увеличить темп' })).toBeDisabled();
  await expect(page.getByText('Доступно офлайн', { exact: true })).toBeVisible();
  await expect(page.getByText('Черновик на устройстве', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Темп BPM', { exact: true })).toHaveValue('240');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Темп BPM', { exact: true })).toHaveValue('240');
  await page.getByRole('button', { name: 'Уменьшить темп' }).click();
  await expect(page.getByLabel('Темп BPM', { exact: true })).toHaveValue('239');
});

test('four-bar fill preview cancels, adds toms atomically and survives offline reload', async ({
  page,
  context,
}) => {
  await page.getByLabel('Количество тактов').selectOption('4');
  await page.getByRole('button', { name: 'Брейки · библиотека и предложения' }).click();
  await page
    .getByRole('button', { name: 'Дополнительно: генератор и произвольный участок' })
    .click();
  await expect(page.getByLabel('Начало брейка')).toHaveValue('14');
  await page.getByRole('button', { name: 'Свободнее · Редкий' }).click();
  await expect(page.getByRole('button', { name: 'Применить брейк' })).toBeVisible();
  await expect(page.locator('.fill-selected')).not.toHaveCount(0);
  const supported = await startOrCheckUnsupported(page);
  await page.getByRole('button', { name: 'Движение · Средний' }).click();
  if (supported) {
    await expect(page.getByRole('button', { name: 'Пауза', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  }

  await page.getByRole('button', { name: 'Отменить предпросмотр' }).click();
  await expect(page.getByRole('button', { name: 'Применить брейк' })).toHaveCount(0);
  for (const name of ['Том 1 (добавить)', 'Том 2 (добавить)', 'Том 3 (добавить)'])
    await page.getByRole('checkbox', { name, exact: true }).check();
  const tomFill = page.getByRole('button', { name: 'Спуск по томам · Средний' });
  await expect(tomFill).toBeDisabled();
  await page.getByRole('checkbox', { name: /Разрешаю добавить/ }).check();
  await tomFill.click();
  await page.getByRole('button', { name: 'Применить брейк' }).click();
  await expect(page.getByRole('button', { name: /Том 3, такт 4, шаг 15/ })).toBeEnabled();
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(page.getByRole('button', { name: /Том 3, такт 4, шаг 15/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page.getByRole('button', { name: /Том 3, такт 4, шаг 15/ })).toBeEnabled();
  await expect(page.getByText('Черновик на устройстве', { exact: true })).toBeVisible();
  await expect(page.getByText('Доступно офлайн', { exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: /Том 3, такт 4, шаг 15/ })).toBeVisible();
  await page.getByRole('button', { name: 'Брейки · библиотека и предложения' }).click();
  await page
    .getByRole('button', { name: 'Дополнительно: генератор и произвольный участок' })
    .click();
  await expect(page.getByRole('button', { name: 'Свободнее · Редкий' })).toBeEnabled();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'MIDI', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('songkit.mid');
});

test('editing the confirmed bit invalidates an unapplied fill even after undo', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Брейки · библиотека и предложения' }).click();
  await page
    .getByRole('button', { name: 'Дополнительно: генератор и произвольный участок' })
    .click();
  await page.getByRole('button', { name: 'Движение · Средний' }).click();
  await page.getByRole('button', { name: 'Увеличить темп' }).click();
  await expect(page.getByRole('button', { name: 'Применить брейк' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Применить брейк' })).toHaveCount(0);
});

test('unapplied preview preserves the saved pattern and editor view across reload', async ({
  page,
}) => {
  await page.getByLabel('Количество тактов').selectOption('4');
  await expect(page.getByText('Черновик на устройстве', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Брейки · библиотека и предложения' }).click();
  await page
    .getByRole('button', { name: 'Дополнительно: генератор и произвольный участок' })
    .click();
  await page.getByRole('button', { name: 'Разгон · Плотный' }).click();
  await expect(page.getByRole('button', { name: 'Такт 4', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: '1/16', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Такт 1', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: '1/8', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.card-bottom')).toContainText('13 ударов');
  await expect(page.getByRole('button', { name: 'Применить брейк' })).toHaveCount(0);
});
