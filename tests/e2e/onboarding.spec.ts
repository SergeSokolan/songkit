import { expect, test } from '@playwright/test';

test('first visit opens the editor, then returning visits preserve the route and draft offline', async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 664 });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Барабанная мастерская' })).toBeVisible();
  await expect
    .poll(() => page.locator('html').evaluate((el) => el.scrollWidth))
    .toBeLessThanOrEqual(320);
  await page.getByRole('link', { name: 'Открыть редактор' }).click();
  const editor = page.getByRole('heading', { name: 'Барабанный редактор' });
  await expect(editor).toBeFocused();
  await expect(page.getByText('Доступно офлайн', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Бочка, такт 1, шаг 2, пусто', exact: true }).click();
  const recorded = page.getByRole('button', { name: 'Бочка, такт 1, шаг 2, Обычный', exact: true });
  await expect(recorded).toBeVisible();
  await expect(page.getByText('Черновик на устройстве', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Инструкция по установке' }).click();
  await expect(page.getByRole('heading', { name: 'Установка SongKit' })).toBeFocused();
  await page.goBack();
  await expect(editor).toBeFocused();
  await expect(recorded).toBeVisible();
  await expect(page.getByRole('button', { name: 'Отменить', exact: true })).toBeEnabled();

  // Profiles created before onboarding have a draft but no first-visit flag.
  await page.evaluate(() => localStorage.removeItem('songkit.openedEditor'));
  await page.goto('./');
  await expect(editor).toBeVisible();
  await expect(recorded).toBeVisible();
  await context.setOffline(true);
  await page.goto('./?view=guide');
  await expect(page.getByRole('heading', { name: 'Установка SongKit' })).toBeVisible();
  await page.goto('./');
  await expect(editor).toBeVisible();
  await expect(recorded).toBeVisible();
});

test('explicit guide and editor links work when local storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Unavailable', 'SecurityError');
      },
    });
  });
  await page.goto('./?view=guide');
  await expect(page.getByRole('heading', { name: 'Установка SongKit' })).toBeVisible();
  await page.getByRole('link', { name: 'Открыть редактор' }).click();
  await expect(page).toHaveURL(/view=editor$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Барабанный редактор' })).toBeVisible();
});

test('an installed launch opens the editor on first use', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Барабанный редактор' })).toBeVisible();
});

test('guide offers manual instructions and only shows install when the browser offers it', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.addEventListener(
      'beforeinstallprompt',
      (event) => {
        if (event.isTrusted) event.stopImmediatePropagation();
      },
      { capture: true },
    );
  });
  await page.goto('./?view=guide');
  const chooser = page.getByRole('combobox', { name: 'Браузер и устройство' });
  const install = page.getByRole('button', { name: 'Установить', exact: true });
  await expect(install).toHaveCount(0);
  await chooser.selectOption('safariIos');
  await expect(page.getByText(/На экран .?Домой/).first()).toBeVisible();
  await chooser.selectOption('firefoxWindows');
  await expect(page.getByText(/143/).first()).toBeVisible();
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, {
      prompt: () => {
        window.dispatchEvent(new Event('appinstalled'));
        return Promise.resolve({ outcome: 'accepted' });
      },
    });
    window.dispatchEvent(event);
  });
  await install.click();
  await expect(page.getByRole('status')).toHaveText('SongKit уже установлен.');
  await expect(install).toHaveCount(0);
  await expect(chooser).toBeEnabled();
});

test('the response contains readable landing copy without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(baseURL!);
    await expect(page.getByRole('heading', { name: 'Барабанная мастерская' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Открыть редактор' })).toHaveAttribute(
      'href',
      '?view=editor',
    );
  } finally {
    await context.close();
  }
});
