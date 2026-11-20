import { expect, test } from '@playwright/test';

for (const modal of ['score', 'tempo', 'strength'] as const) {
  test(`leaving the editor closes the ${modal} modal and preserves the editing session`, async ({
    page,
  }) => {
    await page.goto('./?view=welcome');
    const enter = page.getByRole('link', { name: 'Открыть редактор', exact: true });
    await enter.click();
    const hit = page.getByRole('button', { name: 'Бочка, такт 1, шаг 2, пусто', exact: true });
    await hit.click();
    const openModal = async () => {
      if (modal === 'score') await page.getByRole('button', { name: 'Ноты', exact: true }).click();
      else if (modal === 'tempo')
        await page.getByRole('button', { name: 'Выбрать темп барабаном' }).click();
      else {
        await page.getByRole('button', { name: 'Изменить / перенести удар' }).click();
        await page
          .getByRole('button', { name: 'Бочка, такт 1, шаг 2, Обычный', exact: true })
          .click();
      }
      await expect(page.locator('dialog:modal')).toHaveCount(1);
    };
    await openModal();
    await page.goBack();
    await expect(
      page.getByRole('heading', { name: 'Барабанная мастерская', exact: true }),
    ).toBeFocused();
    await expect(page.locator('dialog:modal')).toHaveCount(0);
    await page.goForward();
    await expect(
      page.getByRole('heading', { name: 'Барабанный редактор', exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole('button', { name: 'Бочка, такт 1, шаг 2, Обычный', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отменить', exact: true })).toBeEnabled();
    await openModal();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog:modal')).toHaveCount(0);
    await page.goBack();
    await enter.click();
    await expect(
      page.getByRole('heading', { name: 'Барабанный редактор', exact: true }),
    ).toBeFocused();
  });
}
