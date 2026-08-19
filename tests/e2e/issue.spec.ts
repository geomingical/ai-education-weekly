import { expect, test } from '@playwright/test';

// Expected strings are hardcoded rather than imported from the message
// catalog: a test that reads its expectations from the code under test would
// pass even if a label were wrong.

test('the home page shows the newest issue with its date range', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('本期 2026-W');
  await expect(page.getByText('涵蓋期間')).toBeVisible();
});

test('every story links out to the original article in a new tab', async ({ page }) => {
  await page.goto('/');
  const link = page.locator('.story__title a').first();
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(link).toHaveAttribute('href', /^https:\/\//);
});

// Nothing on this site was read by a human before it went live, so the page
// must say which words are the model's.
test('every summary carries a provenance badge', async ({ page }) => {
  await page.goto('/');
  const summaries = page.locator('.story__summary:not(.story__summary--empty)');
  const count = await summaries.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    await expect(summaries.nth(index).locator('.story__badge')).toHaveCount(1);
  }
});

test('selecting a topic narrows the list and updates the URL', async ({ page }) => {
  await page.goto('/');
  const countLine = page.locator('[data-result-count]');
  const before = await countLine.textContent();

  await page.selectOption('#story-topic', 'research');
  await expect(page).toHaveURL(/topic=research/);

  const visible = page.locator('.story:not([hidden])');
  expect(await visible.count()).toBeGreaterThan(0);
  await expect(countLine).not.toHaveText(before ?? '');

  for (const row of await visible.all()) {
    expect(await row.getAttribute('data-topics')).toContain('research');
  }
});

test('a filter that matches nothing shows the empty state', async ({ page }) => {
  await page.goto('/');
  await page.fill('#story-query', 'zzzzz-no-such-story-zzzzz');
  await expect(page.locator('[data-empty-state]')).toBeVisible();
  await expect(page.locator('.story:not([hidden])')).toHaveCount(0);
});

test('a shared URL opens already filtered', async ({ page }) => {
  await page.goto('/?topic=research&category=all&region=all');
  await expect(page.locator('#story-topic')).toHaveValue('research');
  for (const row of await page.locator('.story:not([hidden])').all()) {
    expect(await row.getAttribute('data-topics')).toContain('research');
  }
});

test('the language switch reaches the English issue', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-language-link]');
  await expect(page).toHaveURL(/\/en\//);
  await expect(page.locator('h1')).toContainText('Issue 2026-W');
});

test('the archive lists issues and each one opens', async ({ page }) => {
  await page.goto('/archive/');
  await expect(page.locator('h1')).toHaveText('往期週報');
  const first = page.locator('.archive__item a').first();
  const label = await first.textContent();
  await first.click();
  await expect(page.locator('h1')).toContainText(label ?? '');
});

test('the sources page publishes every source with its links', async ({ page }) => {
  await page.goto('/sources/');
  await expect(page.locator('h1')).toHaveText('來源清單');
  const sources = page.locator('.source');
  expect(await sources.count()).toBeGreaterThan(20);
  // Every entry states a homepage, a reuse note, and when it was last checked.
  for (const source of await sources.all()) {
    await expect(source.getByRole('link', { name: '官方網站' })).toHaveCount(1);
    await expect(source.locator('.source__fields dd')).toHaveCount(2);
  }
});

test('the method page states plainly that summaries are machine-written', async ({ page }) => {
  await page.goto('/method/');
  await expect(page.getByText('沒有經過人工逐則審閱就會上線')).toBeVisible();
});
