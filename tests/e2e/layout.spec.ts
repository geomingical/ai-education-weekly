import { expect, test } from '@playwright/test';

// Paths are RELATIVE on purpose. Playwright resolves them with
// `new URL(path, baseURL)`, and a leading slash discards baseURL's sub-path —
// which is exactly the deployment prefix these tests exist to exercise.

const WIDTHS = [320, 375, 414, 768, 1280, 1920];
const PATHS = ['./', 'archive/', 'sources/', 'method/', 'en/'];

// A cheap smoke check: nothing may push the page wider than the viewport at any
// width, in either language. Long feed titles and raw feed URLs are the usual
// culprits and they arrive from third parties, not from us.
for (const width of WIDTHS) {
  for (const path of PATHS) {
    test(`no horizontal overflow at ${width}px on ${path}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
}
