import { expect, test } from '@playwright/test';
test.use({ hasTouch: true, viewport: { width: 390, height: 664 } });
test('first guitar tap routes a real Web Audio signal, and preview can switch to loop on one tap', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const session = { type: 'auto' };
    Object.defineProperty(navigator, 'audioSession', { configurable: true, value: session });
    const metrics = { peak: 0, sessionAtStart: '', contexts: 0 };
    Object.assign(window, { guitarMetrics: metrics });
    if (typeof AudioContext !== 'function') return;
    window.AudioContext = new Proxy(AudioContext, {
      construct(target, args) {
        metrics.sessionAtStart = session.type;
        metrics.contexts++;
        return Reflect.construct(target, args);
      },
    });
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (...args: unknown[]) {
      const destination = args[0];
      if (destination === this.context.destination) {
        const analyser = this.context.createAnalyser();
        const samples = new Float32Array(analyser.fftSize);
        Reflect.apply(connect, analyser, [destination]);
        Reflect.apply(connect, this, [analyser, ...args.slice(1)]);
        const poll = window.setInterval(() => {
          if (this.context.state === 'closed') {
            window.clearInterval(poll);
            return;
          }
          analyser.getFloatTimeDomainData(samples);
          for (const sample of samples) metrics.peak = Math.max(metrics.peak, Math.abs(sample));
        }, 16);
        return destination;
      }
      return Reflect.apply(connect, this, args);
    } as typeof connect;
  });
  await page.goto('?view=welcome');
  await page.getByRole('link', { name: 'Гитара', exact: true }).tap();
  const loop = page.getByRole('button', { name: 'Играть партию', exact: true });
  await loop.tap();
  const read = () =>
    page.evaluate(
      () =>
        (
          window as Window & {
            guitarMetrics: { peak: number; contexts: number; sessionAtStart: string };
          }
        ).guitarMetrics,
    );
  const supported = await page.evaluate(() => typeof AudioContext === 'function');
  console.log('Guitar first tap: native AudioContext available:', supported);
  if (!supported) {
    await expect(page.getByRole('button', { name: 'Попробовать включить звук' })).toBeVisible();
    return;
  }
  await expect.poll(async () => (await read()).peak).toBeGreaterThan(0.002);
  console.log('First tap peak at output:', (await read()).peak);
  expect((await read()).sessionAtStart).toBe('playback');
  await page.getByRole('button', { name: 'Стоп', exact: true }).tap();
  await page.getByRole('button', { name: '▷ Dm', exact: true }).tap();
  await loop.tap();
  await expect(page.getByRole('button', { name: 'Стоп', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Добавить Dm' })).toBeHidden();
  expect((await read()).contexts).toBe(1);
});

test('a stalled audio start times out, the retry remains reachable and replays the same request', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (typeof AudioContext !== 'function') return;
    let calls = 0;
    window.AudioContext = new Proxy(AudioContext, {
      construct(target, args) {
        const ctx = Reflect.construct(target, args);
        if (++calls === 1) {
          Object.defineProperty(ctx, 'state', { get: () => 'suspended' });
          ctx.resume = () => new Promise<void>(() => {});
        }
        return ctx;
      },
    });
  });
  await page.goto('?view=welcome');
  await page.getByRole('link', { name: 'Гитара', exact: true }).tap();
  await page.getByRole('button', { name: '▷ Dm', exact: true }).tap();
  const retry = page.getByRole('button', { name: 'Попробовать включить звук' });
  await expect(retry).toBeVisible({ timeout: 6000 });
  await retry.tap();
  if (await page.evaluate(() => typeof AudioContext === 'function')) {
    await expect(retry).toBeHidden();
    await expect(page.getByRole('heading', { name: /Вариант · Dm/ })).toBeVisible();
  }
});

for (const mode of ['loop', 'riff'] as const) {
  test(`a late ${mode} deadline pauses before another note is scheduled`, async ({ page }) => {
    await page.addInitScript(() => {
      const probe = { offset: 0, starts: 0 };
      Object.assign(window, { guitarClockProbe: probe });
      const param = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} };
      const node = () => ({
        connect() {
          return this;
        },
        disconnect() {},
      });
      class ProbeContext extends EventTarget {
        state = 'running';
        destination = node();
        get currentTime() {
          return performance.now() / 1000 + probe.offset;
        }
        close() {
          this.state = 'closed';
          return Promise.resolve();
        }
        createGain() {
          return { ...node(), gain: param };
        }
        createOscillator() {
          return {
            ...node(),
            frequency: param,
            start() {
              probe.starts++;
            },
            stop() {},
          };
        }
      }
      Object.assign(window, { AudioContext: ProbeContext });
    });
    await page.goto('?view=guitar');
    if (mode === 'riff') await page.getByRole('button', { name: 'Рифф', exact: true }).tap();
    const action = page.getByRole('button', {
      name: mode === 'riff' ? 'Послушать рифф' : 'Играть партию',
      exact: true,
    });
    await action.tap();
    const before = await page.evaluate(() => {
      const probe = (window as Window & { guitarClockProbe: { starts: number; offset: number } })
        .guitarClockProbe;
      probe.offset += 0.4;
      return probe.starts;
    });
    expect(before).toBeGreaterThan(0);
    await expect(action).toBeVisible({ timeout: 3500 });
    expect(
      await page.evaluate(
        () => (window as Window & { guitarClockProbe: { starts: number } }).guitarClockProbe.starts,
      ),
    ).toBe(before);
  });
}
