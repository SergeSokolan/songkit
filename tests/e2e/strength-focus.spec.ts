import { expect, test } from '@playwright/test';

test('strength dialog keeps keyboard focus and returns it to the grid', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('./?view=editor');

  const edit = page.getByRole('button', { name: 'Изменить / перенести удар' });
  const origin = page.getByRole('button', { name: /Малый, такт 1, шаг 4,/ });
  const destination = page.getByRole('button', { name: /Малый, такт 1, шаг 5,/ });
  await origin.press('Enter');
  await expect(origin).toHaveAccessibleName('Малый, такт 1, шаг 4, Обычный');
  await edit.press('Enter');
  await origin.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Сила удара' });
  const close = dialog.getByRole('button', { name: 'Закрыть' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Удалить' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Тихий, сила 35' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(origin).toBeFocused();

  await edit.press('Enter');
  await origin.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(origin).toBeFocused();
  await expect(origin).toHaveAccessibleName('Малый, такт 1, шаг 4, Тихий');

  await edit.press('Enter');
  await origin.press('Enter');
  await dialog.getByRole('button', { name: 'Перенести удар' }).press('Enter');
  await expect(origin).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(destination).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(destination).toBeFocused();
  await expect(destination).toHaveAccessibleName('Малый, такт 1, шаг 5, Тихий');
  await expect(origin).toHaveAccessibleName('Малый, такт 1, шаг 4, пусто');
});
