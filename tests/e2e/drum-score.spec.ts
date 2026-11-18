import { expect, test } from '@playwright/test';

test('drum score draws stacked, straight and triplet hits and is available on first offline use', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('./?view=editor');
  await expect(page.getByText('Доступно офлайн', { exact: true })).toBeVisible();
  const instruments = ['kick', 'snare', 'hat', 'tom1', 'tom2', 'tom3', 'ride', 'crash1', 'crash2'];
  const project = {
    schemaVersion: 2,
    instruments,
    tempo: 100,
    timeSignature: [4, 4],
    barCount: 4,
    events: [
      ...instruments.map((instrument, index) => ({
        instrument,
        tick: 0,
        velocity: index === 1 ? 35 : index === 2 ? 115 : 80,
      })),
      ...[120, 160, 240, 320, 480, 640, 840, 3720, 3840, 4000, 11520].map((tick) => ({
        instrument: 'snare',
        tick,
        velocity: 80,
      })),
    ],
  };
  page.on('dialog', (dialog) => {
    if (dialog.type() === 'confirm') void dialog.accept();
  });
  await page.locator('input[type=file]').setInputFiles({
    name: 'score.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByText('Проект открыт.', { exact: true })).toBeVisible();
  await expect(page.getByText('Черновик на устройстве', { exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  const open = page.getByRole('button', { name: 'Ноты', exact: true });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Барабанная партитура' });
  await expect(dialog.locator('svg .vf-stavenote').first()).toBeVisible();
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  for (const index of [1, 2, 3]) {
    await dialog.getByRole('combobox', { name: 'Такт' }).selectOption({ value: String(index) });
    await expect(
      dialog
        .getByRole('region', { name: `Ноты такта ${index + 1}` })
        .locator('svg .vf-stavenote')
        .first(),
    ).toBeVisible();
    await expect(dialog.getByRole('alert')).toHaveCount(0);
  }
  await dialog.getByRole('button', { name: 'К сетке' }).click();
  await expect(open).toBeFocused();
  await expect(page.getByRole('button', { name: 'Такт 1', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
