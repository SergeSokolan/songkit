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
  await page.getByRole('button', { name: 'Прослушать: Малый восьмыми', exact: true }).click();
  await expect(apply).toHaveCount(1);
  await expect(cancel).toHaveCount(1);
  await expect(advanced.getByRole('button', { name: 'Применить брейк' })).toHaveCount(0);
  await advanced.locator('.fill-candidates button').first().click();
  await expect(apply).toHaveCount(1);
  await expect(advanced.getByRole('button', { name: 'Применить брейк' })).toBeVisible();
  await cancel.click();
  await expect(apply).toHaveCount(0);
  await catalog.getByRole('button', { name: 'Прослушать: Малый восьмыми', exact: true }).click();
  await apply.click();
  await expect(apply).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Отменить', exact: true })).toBeEnabled();
});
