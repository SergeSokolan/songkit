import { expect, test } from '@playwright/test';

test.use({ hasTouch: true, viewport: { width: 390, height: 664 } });

test('first screen exposes the editor and retains access to library and files', async ({
  page,
}) => {
  await page.goto('./?view=editor');
  const firstCell = page.locator('.step').first();
  await expect(firstCell).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Играть у сетки' })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Новая партия' })).toBeInViewport({ ratio: 1 });
  console.log(
    'First cell document Y:',
    await firstCell.evaluate((element) =>
      Math.round(element.getBoundingClientRect().top + scrollY),
    ),
  );

  await expect(firstCell).toHaveAccessibleName(/Обычный/);
  await firstCell.tap();
  await expect(firstCell).toHaveAccessibleName(/Тихий/);
  await page.getByRole('button', { name: 'Отменить', exact: true }).tap();
  await expect(firstCell).toHaveAccessibleName(/Обычный/);

  await page.getByRole('link', { name: 'Ритмы и брейки' }).tap();
  await expect(page.getByRole('heading', { name: 'Ритмы и брейки' })).toBeInViewport();
  await page.getByRole('button', { name: 'Базовые ритмы', exact: true }).tap();
  await page
    .getByRole('button', { name: /Послушать:/ })
    .first()
    .tap();
  await expect(page.getByRole('button', { name: 'Применить ритм' })).toBeVisible();
  await page.getByRole('link', { name: 'К сетке' }).tap();
  await expect(firstCell).toBeInViewport({ ratio: 1 });
  await expect(firstCell).toBeDisabled();

  await page.getByRole('link', { name: 'Файлы' }).tap();
  await expect(page.getByRole('button', { name: 'Открыть проект' })).toBeInViewport();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Проект', exact: true }).tap();
  await expect.poll(async () => (await download).suggestedFilename()).toMatch(/\.json$/);
});
