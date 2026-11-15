import { test, expect } from '@playwright/test';
test('hit counter uses Russian plural forms', async ({ page }) => {
  await page.goto('./');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Новая партия', exact: true }).click();
  await page.getByRole('button', { name: '1/32', exact: true }).click();
  const forms = new Map([
    [0, 'ударов'],
    [1, 'удар'],
    [2, 'удара'],
    [5, 'ударов'],
    [11, 'ударов'],
    [21, 'удар'],
    [22, 'удара'],
  ]);
  for (let count = 0; count <= 22; count++) {
    if (count)
      await page
        .getByRole('button', { name: `Бочка, такт 1, шаг ${count}, пусто`, exact: true })
        .click();
    if (forms.has(count))
      await expect(page.locator('.card-bottom .muted')).toHaveText(
        `${count} ${forms.get(count)} · 4/4`,
      );
  }
});
