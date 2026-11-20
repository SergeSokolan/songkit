import { expect, test } from '@playwright/test';

for (const width of [320, 390, 1280]) {
  for (const scale of [1, 1.5, 2]) {
    test(`instrument picker label fits at ${width}px and ${scale}x text`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('./?view=editor');
      await page.locator('html').evaluate((el, size) => {
        el.style.fontSize = `${size * 100}%`;
      }, scale);
      const picker = page.getByRole('combobox', { name: 'Добавить инструмент' });
      await expect(picker).toBeVisible();
      const caption = page.locator('.instrument-picker > span');
      await expect(caption).toHaveText('Добавить инструмент');
      expect(
        await caption.evaluate((element) => element.getBoundingClientRect().right),
      ).toBeLessThanOrEqual(width);
      if (width < 760) {
        expect(
          await picker.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
        ).toBeGreaterThanOrEqual(16 * scale);
      }
      const metrics = await picker.evaluate((el: HTMLSelectElement) => {
        const style = getComputedStyle(el);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        return {
          available:
            el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
          required: ctx.measureText(el.selectedOptions[0].text).width,
          right: el.getBoundingClientRect().right,
          viewport: innerWidth,
        };
      });
      expect(metrics.available).toBeGreaterThanOrEqual(metrics.required);
      expect(metrics.right).toBeLessThanOrEqual(metrics.viewport);
    });
  }
}
