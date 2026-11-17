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
    await expect(cell()).toHaveAccessibleName(/Обычный/);
    await cell().tap();
    await expect(cell()).toHaveAccessibleName(/Тихий/);
    await cell().tap();
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
