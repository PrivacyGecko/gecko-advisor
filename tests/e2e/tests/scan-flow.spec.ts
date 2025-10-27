// SPDX-License-Identifier: MIT
import { expect, test } from '@playwright/test';

test.describe('Stage functional flow', () => {
  test('scan to share flow', async ({ page }) => {
    test.setTimeout(180_000);

    const targetUrl = 'https://example.com';

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Privacy insights in seconds' })).toBeVisible();

    await page.getByPlaceholder('https://example.com').fill(targetUrl);
    await page.getByRole('button', { name: 'Start Scan' }).click();

    await page.waitForURL('**/scan/**', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Top fixes' })).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText('Share this report')).toBeVisible();

    const currentUrl = new URL(page.url());
    const slugFromQuery = currentUrl.searchParams.get('slug');
    const slugFromPath = currentUrl.pathname.startsWith('/r/')
      ? currentUrl.pathname.split('/').filter(Boolean).pop()
      : undefined;
    const slug = slugFromQuery ?? slugFromPath;
    expect(slug, 'report slug should be present once scan completes').toBeTruthy();

    await page.goto(`/r/${slug}`);
    await expect(page.getByRole('heading', { name: 'Privacy report' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Top fixes' })).toBeVisible();

    await page.goto('/');
    await expect(page.getByText('Your recent scans')).toBeVisible();
    await expect(page.locator('a', { hasText: 'example.com' }).first()).toBeVisible();
  });
});