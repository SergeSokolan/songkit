import { setTimeout } from 'node:timers';
import { docsSourceHash } from './docs-source-hash.mjs';
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const port = Number(process.env.SONGKIT_DOCS_PORT || 4178);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid docs port');
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ],
  {
    env: { ...process.env, BASE_PATH: '/songkit/' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
let browser;
try {
  await Promise.race([
    new Promise((resolve) =>
      server.stdout.on('data', (chunk) => {
        if (chunk.toString().includes('Local:')) resolve();
      }),
    ),
    once(server, 'exit').then(([code]) => {
      throw new Error('Preview exited: ' + code);
    }),
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('Preview startup timeout')), 15000);
      timer.unref();
    }),
  ]);
  browser = await chromium.launch();
  const files = [],
    measurements = [];
  for (const width of [360, 390, 430, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: width < 760 ? 844 : 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/songkit/`);
    await page
      .locator('.app-version')
      .filter({ hasText: 'v' + version })
      .waitFor();
    await page.getByText('Доступно офлайн', { exact: true }).waitFor();
    await page.getByText('Черновик на устройстве', { exact: true }).waitFor();
    measurements.push(
      await page.evaluate(() => {
        const { document, innerWidth } = globalThis;
        const area = document.querySelector('.grid-scroll').getBoundingClientRect();
        const cells = [...document.querySelector('.track-row').querySelectorAll('.step')].map(
          (el) => el.getBoundingClientRect(),
        );
        return {
          viewport: innerWidth,
          noteArea: area.width,
          cellWidth: cells[0].width,
          visibleCells: cells.filter(
            (cell) => cell.left >= area.left - 0.5 && cell.right <= area.right + 0.5,
          ).length,
        };
      }),
    );
    const file = width < 760 ? `after-${width}.png` : 'desktop-1280.png';
    await page.screenshot({
      path: 'docs/screenshots/' + file,
      fullPage: true,
      animations: 'disabled',
    });
    files.push(file);
    if (width === 390) {
      for (const id of ['tom3', 'tom1', 'tom2', 'ride', 'crash1', 'crash2'])
        await page.getByLabel('Добавить инструмент', { exact: true }).selectOption(id);
      await page.getByText('Черновик на устройстве', { exact: true }).waitFor();
      await page.evaluate(() => globalThis.scrollTo(0, 0));
      await page.screenshot({
        path: 'docs/screenshots/full-kit-390.png',
        fullPage: true,
        animations: 'disabled',
      });
      files.push('full-kit-390.png');
    }
    await context.close();
  }
  writeFileSync(
    'docs/screenshots/manifest.json',
    JSON.stringify(
      {
        version,
        uiSourceHash: docsSourceHash(),
        capturedOn: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(
          new Date(),
        ),
        browser: 'Playwright Chromium, CSS viewports; not a real iPhone',
        files,
        measurements,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify(measurements, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
