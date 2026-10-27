import { test, expect } from '@playwright/test';

test('triplet input cycles, moves, undoes and restores mixed ticks offline', async ({
  page,
  context,
}) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('./');
  await page.getByRole('button', { name: 'Новая партия', exact: true }).click();
  await page.getByRole('button', { name: '1/16T', exact: true }).click();
  await expect(page.locator('.track-row').first().locator('.step')).toHaveCount(24);
  const cell = () => page.getByRole('button', { name: /Малый, такт 1, шаг 2,/ });
  await cell().click();
  await cell().click();
  await expect(cell()).toHaveAccessibleName('Малый, такт 1, шаг 2, Тихий');
  await cell().click();
  await expect(cell()).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(cell()).toHaveAccessibleName('Малый, такт 1, шаг 2, Тихий');
  await page.getByRole('button', { name: 'Изменить / перенести удар' }).click();
  await cell().click();
  await page.getByRole('button', { name: 'Перенести удар', exact: true }).click();
  await page.getByRole('button', { name: 'Малый, такт 1, шаг 3, пусто', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Малый, такт 1, шаг 3, Тихий', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '1/32', exact: true }).click();
  await page.getByRole('button', { name: 'Малый, такт 1, шаг 2, пусто', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Малый, такт 1, шаг 2, Обычный', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number[]>((resolve) => {
            const request = indexedDB.open('songkit', 1);
            request.onsuccess = () => {
              const db = request.result;
              const query = db.transaction('drafts').objectStore('drafts').get('current');
              query.onsuccess = () => {
                resolve(query.result.pattern.events.map((e: { tick: number }) => e.tick));
                db.close();
              };
            };
          }),
      ),
    )
    .toEqual([120, 320]);
  await expect(page.getByText('Черновик на устройстве', { exact: true })).toBeVisible();
  await expect(page.getByText('Доступно офлайн', { exact: true })).toBeVisible();
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: '1/8T', exact: true }).click();
  await expect(page.locator('.track-row').first().locator('.step')).toHaveCount(12);
  await expect(
    page.getByRole('button', { name: 'Малый, такт 1, шаг 2, Тихий', exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Проект', exact: true }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream!) chunks.push(c);
  const p = JSON.parse(Buffer.concat(chunks).toString());
  expect(p.events.map((e: { tick: number }) => e.tick)).toEqual([120, 320]);
});

test('catalog preview and groove apply leave unrelated bars intact, offline', async ({
  page,
  context,
}) => {
  await page.goto('./');
  await page.getByLabel('Количество тактов').selectOption('4');
  await page.getByRole('button', { name: 'Такт 3', exact: true }).click();
  await page.getByRole('button', { name: 'Базовые ритмы', exact: true }).click();
  await page.getByLabel('Жанр ритма').selectOption('metal');
  await page.getByRole('button', { name: 'Прослушать: Ровная двойная бочка', exact: true }).click();
  await page.getByRole('button', { name: 'Применить ритм', exact: true }).click();
  await page.getByRole('button', { name: 'Брейки · библиотека и предложения' }).click();
  await page.getByLabel('Жанр брейка').selectOption('metal');
  await page.getByLabel('Длительность брейка').selectOption('1');
  await page.getByLabel('Добавить недостающие дорожки при применении', { exact: true }).check();
  await page.getByRole('button', { name: 'Прослушать: 4 руками + 2 бочкой', exact: true }).click();
  await expect(page.getByRole('button', { name: '1/16T', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Применить брейк', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Том 1, такт 3, шаг 21, Обычный', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(page.locator('.track-label strong').filter({ hasText: 'Том 1' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page.getByText('Черновик на устройстве', { exact: true })).toBeVisible();
  await expect(page.getByText('Доступно офлайн', { exact: true })).toBeVisible();
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Базовые ритмы', exact: true }).click();
  await page.getByLabel('Жанр ритма').selectOption('jazz');
  await expect(
    page.getByRole('button', { name: 'Прослушать: Райд: обратный свинг', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Такт 1', exact: true }).click();
  await page.getByRole('button', { name: '1/8', exact: true }).click();
  await expect(page.locator('.card-bottom')).toContainText('4/4');
  await expect(
    page.getByRole('button', { name: 'Бочка, такт 1, шаг 1, Обычный', exact: true }),
  ).toBeVisible();
});

for (const width of [360, 390, 430, 844, 1280])
  test('full kit layout and sticky transport at ' + width, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
    await page.goto('./');
    for (const instrument of ['tom3', 'tom1', 'tom2', 'ride', 'crash1', 'crash2'])
      await page.getByLabel('Добавить инструмент', { exact: true }).selectOption(instrument);
    await page.locator('.track-row').last().scrollIntoViewIfNeeded();
    const transport = page.getByRole('button', { name: 'Играть у сетки', exact: true });
    const rect = await transport.boundingBox();
    expect(rect!.y).toBeGreaterThanOrEqual(0);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(width === 844 ? 390 : 844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    expect(
      await page
        .locator('.step')
        .first()
        .evaluate((el) => el.getBoundingClientRect().width),
    ).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: info.outputPath('full-kit-' + width + '.png'), fullPage: true });
  });
