import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

test.use({ hasTouch: true });

test('saved preferences reach the document before the editor module runs', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('songkit.theme', 'linen');
    localStorage.setItem('songkit.language', 'en');
  });
  let releaseModule!: () => void;
  const editorCanLoad = new Promise<void>((resolve) => {
    releaseModule = resolve;
  });
  await page.route('**/assets/index-*.js', async (route) => {
    await editorCanLoad;
    await route.continue();
  });
  await page.goto('./', { waitUntil: 'commit' });
  try {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'linen');
    await expect(html).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'Drum editor' })).toHaveCount(0);
  } finally {
    releaseModule();
  }
  await expect(page.getByRole('heading', { name: 'Drum editor' })).toBeVisible();
});

async function exportBytes(page: Page, name: string) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  return readFile((await (await download).path())!);
}

test('theme and language changes preserve the pattern, exports and offline preferences', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('./');
  await expect(page.getByText('Доступно офлайн', { exact: true })).toBeVisible();
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'olive');
  await expect(html).toHaveAttribute('lang', 'ru');
  await page.getByRole('button', { name: 'Бочка, такт 1, шаг 2, пусто', exact: true }).tap();
  await expect(page.getByText('Черновик на устройстве', { exact: true })).toBeVisible();
  const json = await exportBytes(page, 'Проект');
  const midi = await exportBytes(page, 'MIDI');

  await page.getByLabel('Тема', { exact: true }).selectOption('dusk');
  await expect(html).toHaveAttribute('data-theme', 'dusk');
  const dusk = await html.evaluate((element) => getComputedStyle(element).colorScheme);
  await page.getByLabel('Тема', { exact: true }).selectOption('linen');
  await expect(html).toHaveAttribute('data-theme', 'linen');
  await expect
    .poll(() => html.evaluate((element) => getComputedStyle(element).colorScheme))
    .not.toBe(dusk);
  await page.getByLabel('Язык', { exact: true }).selectOption('en');
  await expect(html).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Drum editor' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Grooves and drum fills' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Kick, bar 1, step 2/ })).toBeVisible();
  await expect(page.getByLabel('Theme', { exact: true })).toHaveValue('linen');
  expect(await exportBytes(page, 'Project')).toEqual(json);
  expect(await exportBytes(page, 'MIDI')).toEqual(midi);

  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{'),
  });
  await expect(
    page.getByRole('alert').filter({ hasText: 'could not be read as JSON' }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(html).toHaveAttribute('lang', 'en');
  await expect(html).toHaveAttribute('data-theme', 'linen');
  await expect(page.getByLabel('Language', { exact: true })).toHaveValue('en');
  expect(await exportBytes(page, 'Project')).toEqual(json);
});

test('preference controls fit narrow screens and work when local storage is blocked', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 664 });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Blocked by test profile', 'SecurityError');
      },
    });
  });
  await page.goto('./');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'olive');
  await expect(html).toHaveAttribute('lang', 'ru');
  const theme = page.getByLabel('Тема', { exact: true });
  await theme.focus();
  await expect(theme).toBeFocused();
  await page.keyboard.press('Tab');
  const language = page.getByLabel('Язык', { exact: true });
  await expect(language).toBeFocused();
  await theme.selectOption('dusk');
  await language.selectOption('en');
  await expect(html).toHaveAttribute('data-theme', 'dusk');
  await expect(html).toHaveAttribute('lang', 'en');
  await expect.poll(() => html.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(320);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Барабанный редактор' })).toBeVisible();
  await expect(html).toHaveAttribute('data-theme', 'olive');
});
