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
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Всё начинается/ })).toBeVisible();
});
test('edit fine notes, dynamics, undo and restore across reload', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Новая партия', exact: true }).click();
  await page.getByRole('button', { name: '1/32', exact: true }).click();
  await page.getByRole('button', { name: 'Малый, такт 1, шаг 2, пусто', exact: true }).click();
  await page
    .getByRole('button', { name: 'Малый, такт 1, шаг 2, Обычный', exact: true })
    .click({ button: 'right' });
  await page.getByRole('button', { name: 'Тихий, сила 35' }).click();
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
          new Promise<number>((resolve) => {
            const r = indexedDB.open('songkit', 1);
            r.onsuccess = () => {
              const db = r.result,
                tx = db.transaction('drafts'),
                q = tx.objectStore('drafts').get('current');
              q.onsuccess = () => {
                resolve(q.result?.pattern?.events?.[0]?.velocity ?? 0);
                db.close();
              };
            };
          }),
      ),
    )
    .toBe(35);
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
    else expect(JSON.parse(bytes.toString()).schemaVersion).toBe(1);
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
