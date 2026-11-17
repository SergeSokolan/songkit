import { test, expect } from '@playwright/test';
test('only the active fill panel offers apply and cancel', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Брейки · библиотека и предложения' }).click();
  await page
    .getByRole('button', { name: 'Дополнительно: генератор и произвольный участок' })
    .click();
  const catalog = page.getByRole('region', { name: 'Каталог брейков', exact: true });
  const advanced = page.getByRole('region', { name: 'Брейки', exact: true });
  const apply = page.getByRole('button', { name: 'Применить брейк', exact: true });
  const cancel = page.getByRole('button', { name: 'Отменить предпросмотр', exact: true });
  await page.getByRole('button', { name: 'Предпросмотр: Малый восьмыми', exact: true }).click();
  await expect(apply).toHaveCount(1);
  await expect(cancel).toHaveCount(1);
  await expect(advanced.getByRole('button', { name: 'Применить брейк' })).toHaveCount(0);
  await advanced.locator('.fill-candidates button').first().click();
  await expect(apply).toHaveCount(1);
  await expect(advanced.getByRole('button', { name: 'Применить брейк' })).toBeVisible();
  await cancel.click();
  await expect(apply).toHaveCount(0);
  await catalog.getByRole('button', { name: 'Предпросмотр: Малый восьмыми', exact: true }).click();
  await apply.click();
  await expect(apply).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Отменить', exact: true })).toBeEnabled();
});

test('the selected fill shows scope and offers playback and apply in its card', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByLabel('Количество тактов').selectOption('2');
  await page.getByRole('button', { name: 'Такт 2', exact: true }).click();
  await page.getByRole('button', { name: 'Брейки · библиотека и предложения' }).click();
  await page.getByLabel('Жанр брейка').selectOption('metal');
  await page.getByLabel('Длительность брейка').selectOption('1');
  const card = page.locator('article').filter({
    has: page.getByRole('heading', { name: '4 руками + 2 бочкой', exact: true }),
  });
  const select = card.getByRole('button', { name: 'Предпросмотр: 4 руками + 2 бочкой' });
  await expect(select).toBeDisabled();
  await page.getByLabel('Добавить недостающие дорожки при применении').check();
  await select.click();
  const summary = card.getByRole('status');
  await expect(summary).toContainText('такт 2, доля 4 → конец такта 2');
  await expect(summary).toContainText('Добавятся: Том 1');
  await expect(page.getByRole('button', { name: 'Играть', exact: true })).toBeVisible();
  const play = card.getByRole('button', { name: 'Играть предпросмотр' });
  const supported = await page.evaluate(() => typeof AudioContext === 'function');
  await play.click();
  if (supported) {
    const pause = card.getByRole('button', { name: 'Пауза предпросмотра' });
    await expect(pause).toBeVisible();
    await pause.click();
    await expect(play).toBeEnabled();
  }
  await card.getByRole('button', { name: 'Отменить предпросмотр' }).click();
  await expect(page.locator('.fill-selected')).toHaveCount(0);
  await select.click();
  await card.getByRole('button', { name: 'Применить брейк' }).click();
  await expect(page.getByRole('button', { name: /Том 1, такт 2, шаг 21, Обычный/ })).toBeEnabled();
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(page.getByRole('button', { name: /Том 1, такт 2, шаг/ })).toHaveCount(0);
});
