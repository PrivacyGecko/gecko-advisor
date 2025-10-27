// SPDX-License-Identifier: MIT
import { expect, test } from '@playwright/test';

test('home loads', async ({ page }) => {
  await page.goto('/');

  // Verify main heading is visible
  await expect(page.getByRole('heading', { name: 'Privacy insights in seconds' })).toBeVisible();

  // Verify scan input is present and functional
  await expect(page.getByPlaceholder('https://example.com')).toBeVisible();

  // Verify Start Scan button is present
  await expect(page.getByRole('button', { name: 'Start Scan' })).toBeVisible();

  // Verify Recent community reports section exists
  await expect(page.getByRole('heading', { name: 'Recent community reports' })).toBeVisible();

  // Verify Your recent scans section exists
  await expect(page.getByRole('heading', { name: 'Your recent scans' })).toBeVisible();
});

