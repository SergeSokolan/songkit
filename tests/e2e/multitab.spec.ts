import { expect, test } from '@playwright/test';

test('first entry from guitar loads the current drum draft and stale drum edits preserve the other tab', async ({
  page,
  context,
}) => {
  await page.goto('?view=editor');
  const cell = (step: number) => new RegExp('Бочка, такт 1, шаг ' + step + ',');
  const other = await context.newPage();
  await other.goto('?view=guitar');
  await expect(other.getByRole('combobox', { name: 'Темп', exact: true })).toBeVisible();
  await page.getByRole('button', { name: cell(2) }).click();
  await expect(page.getByText('Черновик на устройстве', { exact: true })).toBeVisible();
  await other.getByRole('link', { name: 'Ударные' }).click();
  await expect(other.getByRole('button', { name: cell(2) })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: cell(4) }).click();
  await expect(page.getByText('Черновик на устройстве', { exact: true })).toBeVisible();
  await other.getByRole('button', { name: cell(6) }).click();
  await expect(other.getByText(/изменён в другой вкладке/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: cell(4) })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: cell(6) })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('stale guitar edits and their pending journal preserve the other tab’s saved tempo', async ({
  page,
  context,
}) => {
  await page.goto('?view=guitar');
  const tempo = page.getByRole('combobox', { name: 'Темп', exact: true });
  await expect(tempo).toHaveValue('120');
  const other = await context.newPage();
  await other.goto('?view=guitar');
  const stale = other.getByRole('combobox', { name: 'Темп', exact: true });
  await expect(stale).toHaveValue('120');
  await page.getByRole('button', { name: '▷ Dm', exact: true }).click();
  await page.getByRole('button', { name: 'Добавить Dm' }).click();
  await tempo.selectOption('135');
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('songkit.guitar.pending')))
    .toBeNull();
  await stale.selectOption('145');
  await expect(other.getByText(/изменён в другой вкладке/)).toBeVisible();
  await other.reload();
  await expect(other.getByText(/изменён в другой вкладке/)).toBeVisible();
  await expect(stale).toHaveValue('145');
  await page.reload();
  await expect(tempo).toHaveValue('135');
  await expect(page.getByRole('button', { name: /2 · Dm/ })).toBeVisible();
  other.once('dialog', (dialog) => dialog.accept());
  await other.getByRole('button', { name: 'Открыть сохранённую версию' }).click();
  await expect(stale).toHaveValue('135');
  await expect(other.getByRole('button', { name: /2 · Dm/ })).toBeVisible();
});
