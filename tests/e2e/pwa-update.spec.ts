import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from 'vite';

test('PWA updates after an explicit choice and preserves the draft', async ({ context, page }) => {
  test.setTimeout(60_000);
  const directory = await mkdtemp(join(tmpdir(), 'songkit-update-'));
  const versions = ['0.0.1', '0.0.2'];
  let current = versions[0];
  let rejectNewBundle = false;
  let failedBundleRequests = 0;
  const types: Record<string, string> = {
    html: 'text/html',
    js: 'text/javascript',
    css: 'text/css',
    wav: 'audio/wav',
    webmanifest: 'application/manifest+json',
  };
  const server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (!path.startsWith('/songkit/') || path.includes('..')) {
      res.writeHead(404).end();
      return;
    }
    const file = path.slice('/songkit/'.length) || 'index.html';
    if (rejectNewBundle && /^assets\/index-.*\.js$/.test(file)) {
      failedBundleRequests++;
      res.writeHead(503).end();
      return;
    }
    try {
      const content = await readFile(join(directory, current, file));
      res
        .writeHead(200, {
          'Content-Type': types[file.split('.').at(-1)!] ?? 'application/octet-stream',
          'Cache-Control': 'no-store',
        })
        .end(content);
    } catch {
      res.writeHead(404).end();
    }
  });
  try {
    for (const version of versions) {
      await build({
        base: '/songkit/',
        define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(version) },
        build: { outDir: join(directory, version), emptyOutDir: true },
        logLevel: 'silent',
      });
    }
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing HTTP port');
    const url = 'http://127.0.0.1:' + address.port + '/songkit/?view=editor';
    await page.goto(url);
    await expect(page.locator('.app-version')).toHaveText('v0.0.1');
    await expect(page.getByText('Доступно офлайн', { exact: true })).toBeVisible();
    await page.reload();
    const other = await context.newPage();
    await other.goto(url);
    await expect(other.locator('.app-version')).toHaveText('v0.0.1');

    current = versions[1];
    rejectNewBundle = true;
    const failedState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error('Missing service worker registration');
      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Failed install did not finish')),
          10_000,
        );
        registration.addEventListener(
          'updatefound',
          () => {
            const installing = registration.installing;
            if (!installing) return;
            const finished = () => {
              if (installing.state !== 'redundant' && installing.state !== 'installed') return;
              clearTimeout(timeout);
              installing.removeEventListener('statechange', finished);
              resolve(installing.state);
            };
            installing.addEventListener('statechange', finished);
            finished();
          },
          { once: true },
        );
        void registration.update().catch(reject);
      });
    });
    expect(failedState).toBe('redundant');
    expect(failedBundleRequests).toBeGreaterThan(0);
    await expect(page.locator('.app-version')).toHaveText('v0.0.1');
    await expect(page.getByRole('button', { name: 'Обновить', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Такт 1', exact: true })).toBeEnabled();
    rejectNewBundle = false;
    for (const client of [page, other]) {
      await client.evaluate(async () =>
        (await navigator.serviceWorker.getRegistration())?.update(),
      );
      await expect(client.getByRole('button', { name: 'Обновить', exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Позже', exact: true }).click();
    await expect(page.locator('.app-version')).toHaveText('v0.0.1');
    const tempo = page.getByLabel('Темп BPM', { exact: true });
    await tempo.fill('239');
    await tempo.press('Enter');
    const restoreStorage = await page.evaluateHandle(() => {
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
        const request = put.apply(this, args);
        if (this.name === 'drafts') this.transaction.abort();
        return request;
      };
      return () => {
        IDBObjectStore.prototype.put = put;
      };
    });
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Обновить', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Скачайте проект' })).toBeVisible();
    await expect(page.locator('.app-version')).toHaveText('v0.0.1');
    await expect(tempo).toHaveValue('239');
    await expect(page.getByRole('button', { name: 'Проект', exact: true })).toBeEnabled();
    await restoreStorage.evaluate((restore) => restore());
    await restoreStorage.dispose();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Обновить', exact: true }).click();
    await expect(page.locator('.app-version')).toHaveText('v0.0.2');
    await expect(tempo).toHaveValue('239');
    await expect(page.getByRole('button', { name: 'Обновить', exact: true })).toHaveCount(0);
    await expect(other.locator('.app-version')).toHaveText('v0.0.1');
    await other.close();
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.app-version')).toHaveText('v0.0.2');
    await expect(tempo).toHaveValue('239');

    // Redeploy the previous verified build and use the regular update flow.
    current = versions[0];
    await context.setOffline(false);
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    await expect(page.getByRole('button', { name: 'Обновить', exact: true })).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Обновить', exact: true }).click();
    await expect(page.locator('.app-version')).toHaveText('v0.0.1');
    await expect(tempo).toHaveValue('239');
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
