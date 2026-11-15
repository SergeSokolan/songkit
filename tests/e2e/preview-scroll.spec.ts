import { expect, test } from '@playwright/test';

for (const { name, grid, count } of [
  { name: '4 руками + 2 бочкой', grid: '1/16T', count: 6 },
  { name: '2 руками + 2 бочкой', grid: '1/16', count: 4 },
]) {
  test(`quarter-bar preview scrolls to all ${count} highlighted steps and restores the edit view`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 664 });
    await page.goto('./');

    const editorGrid = page.getByRole('button', { name: '1/8', exact: true });
    await editorGrid.click();
    const scroll = page.locator('.grid-scroll');
    await scroll.evaluate(async (element) => {
      const scrolled = new Promise<void>((resolve) => {
        element.addEventListener('scroll', () => resolve(), { once: true });
      });
      element.scrollLeft = 20;
      await scrolled;
    });
    const originalScroll = await scroll.evaluate((element) => element.scrollLeft);
    expect(originalScroll).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Брейки · библиотека и предложения' }).click();
    await page.getByLabel('Жанр брейка').selectOption('metal');
    await page.getByLabel('Длительность брейка').selectOption('1');
    await page.getByLabel('Добавить недостающие дорожки при применении').check();
    await page.getByRole('button', { name: `Прослушать: ${name}`, exact: true }).click();

    await expect(page.getByRole('button', { name: grid, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect
      .poll(() =>
        scroll.evaluate((element) => {
          const viewport = element.getBoundingClientRect();
          return Array.from(
            element.querySelectorAll('.fill-selected[data-instrument="kick"]'),
          ).filter((cell) => {
            const rect = cell.getBoundingClientRect();
            return rect.left >= viewport.left - 1 && rect.right <= viewport.right + 1;
          }).length;
        }),
      )
      .toBe(count);

    await page.getByRole('button', { name: 'Отменить предпросмотр' }).click();
    await expect(editorGrid).toHaveAttribute('aria-pressed', 'true');
    await expect(scroll.locator('.fill-selected')).toHaveCount(0);
    await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBe(originalScroll);
  });
}
