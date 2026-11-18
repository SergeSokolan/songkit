import { createServer } from 'node:http';
import { expect, test } from '@playwright/test';

test('production CSP rejects injected scripts and connections to a second origin', async ({
  page,
}) => {
  let outsideRequests = 0;
  const outside = createServer((_req, res) => {
    outsideRequests++;
    res
      .writeHead(200, {
        'Content-Type': 'text/javascript',
        'Access-Control-Allow-Origin': '*',
      })
      .end('document.documentElement.dataset.externalScriptRan = "yes";');
  });
  await new Promise<void>((resolve) => outside.listen(0, '127.0.0.1', resolve));
  try {
    const address = outside.address();
    if (!address || typeof address === 'string') throw new Error('Missing test port');
    const origin = 'http://127.0.0.1:' + address.port;
    await page.goto('./?view=editor');
    await expect(page.getByRole('heading', { name: 'Барабанный редактор' })).toBeVisible();
    const violations = await page.evaluate(async (url) => {
      const result = new Set<string>();
      return new Promise<string[]>((resolve) => {
        const listener = (event: SecurityPolicyViolationEvent) => {
          if (event.blockedURI !== 'inline' && !event.blockedURI.startsWith(url)) return;
          result.add(event.effectiveDirective);
          if (result.has('script-src-elem') && result.has('connect-src')) {
            clearTimeout(timeout);
            document.removeEventListener('securitypolicyviolation', listener);
            resolve([...result]);
          }
        };
        const timeout = setTimeout(() => {
          document.removeEventListener('securitypolicyviolation', listener);
          resolve([...result]);
        }, 2000);
        document.addEventListener('securitypolicyviolation', listener);
        const inline = document.createElement('script');
        inline.textContent = 'document.documentElement.dataset.inlineScriptRan = "yes";';
        document.head.append(inline);
        const external = document.createElement('script');
        external.src = url + '/outside.js';
        document.head.append(external);
        void fetch(url + '/outside.js').catch(() => {});
      });
    }, origin);
    expect(violations).toContain('script-src-elem');
    expect(violations).toContain('connect-src');
    expect(outsideRequests).toBe(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-inline-script-ran', 'yes');
    await expect(page.locator('html')).not.toHaveAttribute('data-external-script-ran', 'yes');
    await expect(page.getByText('Доступно офлайн', { exact: true })).toBeVisible();
    const cell = page.getByRole('button', { name: 'Бочка, такт 1, шаг 2, пусто', exact: true });
    await cell.click();
    await expect(
      page.getByRole('button', { name: 'Бочка, такт 1, шаг 2, Обычный', exact: true }),
    ).toBeVisible();
  } finally {
    outside.closeAllConnections();
    await new Promise<void>((resolve) => outside.close(() => resolve()));
  }
});

test('an oversized or invalid project does not erase an existing hit', async ({ page }) => {
  await page.goto('./?view=editor');
  await page.getByRole('button', { name: 'Бочка, такт 1, шаг 2, пусто', exact: true }).click();
  const file = page.locator('input[type=file]');
  for (const [content, message] of [
    [Buffer.alloc(1024 * 1024 + 1, 32), 'Файл больше 1 МБ'],
    [
      Buffer.from(
        '{"schemaVersion":2,"tempo":90,"timeSignature":[4,4],"barCount":1,"instruments":["kick","snare","hat"],"events":[{"instrument":"kick","tick":-1,"velocity":80}]}',
      ),
      'Неверные параметры удара',
    ],
  ] as const) {
    await file.setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: content,
    });
    await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Бочка, такт 1, шаг 2, Обычный', exact: true }),
    ).toBeVisible();
  }
});
