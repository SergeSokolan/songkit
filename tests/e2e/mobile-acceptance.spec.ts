import { expect, test } from '@playwright/test';

test.use({ hasTouch: true, viewport: { width: 390, height: 664 } });

test('mobile editor acceptance: tap, cancel a gesture, and restore the draft offline', async ({
  context,
  page,
}) => {
  await page.goto('./');
  const cell = () => page.getByRole('button', { name: /Бочка, такт 1, шаг 2,/ });

  await test.step('Tap through three hit states', async () => {
    await expect(cell()).toHaveAccessibleName(/пусто/);
    await cell().tap();
    await cell().tap();
    await expect(cell()).toHaveAccessibleName(/Тихий/);
    await cell().tap();
    await expect(cell()).toHaveAccessibleName(/пусто/);
  });

  await test.step('Suppress the touch context menu and keep explicit editing available', async () => {
    await cell().tap();
    const prevented = await cell().evaluate((element) => {
      return !element.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      );
    });
    expect(prevented).toBe(true);
    await expect(page.getByRole('dialog', { name: 'Сила удара' })).toHaveCount(0);
    await expect(cell()).toHaveAccessibleName(/Обычный/);
    await page.getByRole('button', { name: 'Изменить / перенести удар' }).tap();
    await cell().tap();
    await page.getByRole('button', { name: 'Перенести удар', exact: true }).tap();
    const destination = page.getByRole('button', { name: /Бочка, такт 1, шаг 3,/ });
    await destination.tap();
    await expect(destination).toHaveAccessibleName(/Обычный/);
    await expect(cell()).toHaveAccessibleName(/пусто/);
  });

  await test.step('Horizontal scroll and cancelled touch leave the hit unchanged', async () => {
    await page.getByRole('button', { name: '1/32', exact: true }).tap();
    await cell().dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', button: 0 });
    const scroll = page.locator('.grid-scroll');
    await scroll.evaluate((element) => {
      element.scrollLeft = 120;
    });
    await cell().dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch' });
    await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await expect(cell()).toHaveAccessibleName(/пусто/);
  });

  await test.step('Restore the confirmed hit after an offline reload', async () => {
    await cell().tap();
    await expect(cell()).toHaveAccessibleName(/Обычный/);
    await expect(page.getByText('Черновик на устройстве', { exact: true })).toBeVisible();
    await expect(page.getByText('Доступно офлайн', { exact: true })).toBeVisible();
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await expect(cell()).toHaveAccessibleName(/Обычный/);
  });
});

test('large track labels stay above their cells in the compact grid', async ({ page }) => {
  await page.goto('./');
  for (const instrument of ['tom3', 'tom1', 'tom2', 'ride', 'crash1', 'crash2'])
    await page.getByLabel('Добавить инструмент', { exact: true }).selectOption(instrument);

  await page.addStyleTag({
    content: '.mobile-track-name { font-size: 24px !important; line-height: 1.3 !important; }',
  });

  for (const width of [390, 760]) {
    await page.setViewportSize({ width, height: width === 390 ? 664 : 390 });
    for (const grid of ['1/8', '1/16', '1/32']) {
      await page.getByRole('button', { name: grid, exact: true }).tap();
      const tracks = page.locator('.track-block');
      await expect(tracks).toHaveCount(9);
      const layout = await tracks.evaluateAll((blocks) =>
        blocks.map((block) => {
          const label = block.querySelector('.mobile-track-name')!;
          const hit = block.querySelector('.step')!.getBoundingClientRect();
          const box = label.getBoundingClientRect();
          return {
            textFits: label.scrollWidth <= label.clientWidth,
            aboveHit: box.bottom <= hit.top,
            targetWidth: hit.width,
          };
        }),
      );
      for (const row of layout) {
        expect(row.textFits).toBe(true);
        expect(row.aboveHit).toBe(true);
        expect(row.targetWidth).toBeGreaterThanOrEqual(44);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    }
  }
});
