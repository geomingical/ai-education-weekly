import { expect, test } from '@playwright/test';

// Paths are RELATIVE on purpose. Playwright resolves them with
// `new URL(path, baseURL)`, and a leading slash discards baseURL's sub-path —
// which is exactly the deployment prefix these tests exist to exercise.

// The one degradation that can actually happen to a real visitor. Every story
// is server-rendered, so with JavaScript off the page still reads and every
// link still works — filters simply do not narrow.
test.use({ javaScriptEnabled: false });

test('every story is readable and linked with JavaScript disabled', async ({ page }) => {
  await page.goto('./');
  const stories = page.locator('.story');
  const count = await stories.count();
  expect(count).toBeGreaterThan(0);

  for (const story of await stories.all()) {
    await expect(story).toBeVisible();
    await expect(story.locator('.story__title a')).toHaveAttribute('href', /^https:\/\//);
  }
});

test('the archive and sources pages work with JavaScript disabled', async ({ page }) => {
  await page.goto('archive/');
  expect(await page.locator('.archive__item').count()).toBeGreaterThan(0);
  await page.goto('sources/');
  expect(await page.locator('.source').count()).toBeGreaterThan(0);
});
