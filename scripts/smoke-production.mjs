import { chromium, expect } from '@playwright/test';

const [version] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  throw new Error('Usage: node scripts/smoke-production.mjs X.Y.Z');
}

const production = 'https://sergesokolan.github.io/songkit/';
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 664 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const response = await page.goto(production);
  expect(response?.ok(), 'Production returns HTTP success').toBe(true);
  const footer = page.locator('.app-version');
  await expect(footer).toHaveText(`v${version}`, { timeout: 30_000 });
  // A fresh profile downloads the precache from Pages before it can work offline.
  await expect(page.getByText('Доступно офлайн', { exact: true })).toBeVisible({ timeout: 90_000 });

  const note = page.getByRole('button', { name: /Бочка, такт 1, шаг 2, пусто/ });
  await note.tap();
  const recorded = page.getByRole('button', { name: /Бочка, такт 1, шаг 2, Обычный/ });
  await expect(recorded).toBeVisible();
  await expect(page.getByText('Черновик на устройстве', { exact: true })).toBeVisible();
  await page.reload();
  await expect(recorded).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(footer).toHaveText(`v${version}`);
  await expect(recorded).toBeVisible();
  console.log(`Production v${version}: mobile editing, offline reload and draft verified.`);
} finally {
  await browser.close();
}
