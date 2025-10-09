import { expect, test } from '@playwright/test';

test('home loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Privacy insights in seconds' })).toBeVisible();
});

