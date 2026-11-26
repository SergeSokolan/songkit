import { expect, test, type Locator } from '@playwright/test';

test.use({ hasTouch: true, viewport: { width: 390, height: 664 } });

async function expectTouchTarget(target: Locator) {
  await expect(target).toBeVisible();
  const { width, height } = await target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  expect(width, target.toString()).toBeGreaterThanOrEqual(44);
  expect(height, target.toString()).toBeGreaterThanOrEqual(44);
}

test('an off-centre tap opens the circle while the adjacent cadence stays closed', async ({
  page,
}) => {
  await page.goto('?view=guitar');
  const circle = page.locator('summary').filter({ hasText: 'Связи на круге' });
  const cadence = page.locator('summary').filter({ hasText: 'Вернуться в Am через E' });
  await circle.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const { x, y } = await circle.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x + 80, y: rect.y + rect.height / 2 + 12 };
  });
  await page.touchscreen.tap(x, y);
  await expect(page.locator('.key-circle')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Послушать E → Am' })).toBeHidden();
  for (const target of [
    circle,
    cadence,
    page.locator('summary').filter({ hasText: 'Как выбрать форму?' }),
  ]) {
    await expectTouchTarget(target);
  }
});

test('guitar controls keep a touch-sized target through chord preview and riff practice', async ({
  page,
}) => {
  await page.goto('?view=guitar');
  const preview = page.getByRole('button', { name: '▷ Dm', exact: true });
  await expectTouchTarget(page.getByRole('link', { name: 'Ударные', exact: true }));
  await expectTouchTarget(preview);
  await preview.tap();
  const add = page.getByRole('button', { name: 'Добавить Dm' });
  await expectTouchTarget(add);
  await add.tap();
  await expectTouchTarget(page.getByRole('button', { name: '2 · Dm' }));
  await page.getByRole('button', { name: 'Рифф', exact: true }).tap();
  await expectTouchTarget(page.getByRole('button', { name: 'Сыграть со мной' }));
});

test('drum controls and sound-help link remain touch-sized on iPhone', async ({ page }) => {
  await page.goto('?view=editor');
  await expectTouchTarget(page.getByLabel('Темп BPM', { exact: true }));
  await expectTouchTarget(page.getByRole('button', { name: 'Такт 1', exact: true }));
  const help = page.locator('.audio-help summary');
  await expectTouchTarget(help);
  await help.tap();
  await expectTouchTarget(page.getByRole('link', { name: /Открыть сайт в браузере/ }));
});
