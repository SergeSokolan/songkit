import { expect, test } from '@playwright/test';
test.use({ hasTouch: true });

test('try another form without losing an edited riff', async ({ page }) => {
  await page.goto('?view=guitar');
  await page.getByRole('button', { name: 'Рифф', exact: true }).click();
  await page.getByLabel('Доля 4').selectOption('-1');
  await page.getByRole('button', { name: 'Аккорды', exact: true }).click();
  const prompts: string[] = [];
  page.on('dialog', async (dialog) => {
    prompts.push(dialog.message());
    await dialog.accept();
  });
  await page.getByLabel('Постановка').selectOption('E');
  expect(prompts).toHaveLength(0);
  await expect(page.getByRole('table', { name: 'Образец риффа' })).toBeVisible();
  await page.getByRole('button', { name: 'Послушать образец риффа' }).click();
  await expect(page.getByRole('button', { name: 'Применить постановку' })).toBeVisible();
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(page.getByLabel('Постановка')).toHaveValue('A');
  await page.getByRole('button', { name: 'Рифф', exact: true }).click();
  await expect(page.getByLabel('Доля 4')).toHaveValue('-1');
  await page.getByRole('button', { name: 'Аккорды', exact: true }).click();
  await page.getByLabel('Постановка').selectOption('E');
  await page.getByRole('button', { name: 'Применить постановку' }).click();
  expect(prompts).toHaveLength(1);
  await page.reload();
  await expect(page.getByLabel('Постановка')).toHaveValue('E');
});

test('touch navigation focuses the heading silently while keyboard navigation keeps its cue', async ({
  page,
}) => {
  await page.goto('?view=welcome');
  const link = page.getByRole('link', { name: 'Гитара', exact: true });
  await link.tap();
  const heading = page.getByRole('heading', { name: 'Гитара', exact: true });
  await expect(heading).toBeFocused();
  await expect(heading).toHaveCSS('outline-style', 'none');
  await page.goBack();
  await page.keyboard.press('Tab');
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(heading).toBeFocused();
  await expect(heading).toHaveCSS('outline-style', 'solid');
});
test('CAGED help compares and auditions two catalogue shapes', async ({ page }) => {
  await page.goto('?view=guitar');
  await page.getByText('Как сыграть аккорд выше на грифе?', { exact: false }).click();
  const example = page
    .locator('details')
    .filter({ has: page.getByText('Как сыграть аккорд выше на грифе?', { exact: false }) });
  await expect(example.locator('.chord-chart')).toHaveCount(2);
  await example.getByRole('button', { name: 'Послушать открытый C' }).click();
  await example.getByRole('button', { name: 'Послушать C в форме A' }).click();
  await expect(page.getByLabel('Тональность партии')).toHaveValue('Am');
});
