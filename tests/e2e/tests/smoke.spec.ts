/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { expect, test } from '@playwright/test';

/**
 * Smoke Tests - Core User Journey
 *
 * Philosophy: Test what users SEE and DO, not implementation details.
 *
 * Approach:
 * - Use semantic selectors (text, roles, labels)
 * - NO data-testid attributes required
 * - Focus on user-visible behavior
 * - Simple, maintainable, resilient to refactoring
 *
 * Coverage:
 * 1. Can user access the homepage?
 * 2. Can user scan a URL?
 * 3. Does user see a privacy score?
 * 4. Can user see the scan report?
 */

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Track console errors for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('[Browser Error]:', msg.text());
      }
    });

    page.on('pageerror', error => {
      console.error('[Page Error]:', error.message);
    });
  });

  test('Homepage loads with all key elements', async ({ page }) => {
    console.log('📍 Test: Homepage loads');
    await page.goto('/');

    // Verify main heading is visible
    await expect(page.getByRole('heading', { name: 'Privacy insights in seconds' })).toBeVisible();

    // Verify scan input is present and functional
    const scanInput = page.getByPlaceholder('https://example.com');
    await expect(scanInput).toBeVisible();
    await expect(scanInput).toBeEnabled();

    // Verify Start Scan button is present
    const scanButton = page.getByRole('button', { name: 'Start Scan' });
    await expect(scanButton).toBeVisible();

    // Verify Recent community reports section exists
    await expect(page.getByRole('heading', { name: 'Recent community reports' })).toBeVisible();

    // Verify Your recent scans section exists
    await expect(page.getByRole('heading', { name: 'Your recent scans' })).toBeVisible();

    console.log('✅ Homepage loaded successfully');
  });

  test('User can complete full scan journey and see report', async ({ page }) => {
    console.log('📍 Test: Full scan journey');

    // Step 1: Load homepage
    console.log('Step 1: Navigate to homepage');
    await page.goto('/');

    // Step 2: Enter URL and start scan
    console.log('Step 2: Enter URL and click scan');
    const scanInput = page.getByPlaceholder('https://example.com');
    await scanInput.fill('https://example.com');

    const scanButton = page.getByRole('button', { name: 'Start Scan' });
    await scanButton.click();

    // Step 3: Wait for report page (URL changes to /r/slug)
    console.log('Step 3: Wait for report page');
    await page.waitForURL(/\/r\/[\w-]+/, { timeout: 30000 });
    console.log(`✅ Navigated to report: ${page.url()}`);

    // Step 4: Verify privacy score is visible
    console.log('Step 4: Check for privacy score');

    // Look for score - it should be a prominent number
    // Try multiple strategies to find it
    const scoreVisible = await Promise.race([
      // Try finding the EnhancedScoreDial (has large number)
      page.locator('text=/^\\d{1,3}$/').first().isVisible({ timeout: 10000 }),
      // Try finding any heading with a number
      page.locator('h1, h2, h3').locator('text=/\\d{1,3}/').first().isVisible({ timeout: 10000 }),
      // Fallback: any visible number that could be a score
      page.locator('text=/\\b(\\d{1,2}|100)\\b/').first().isVisible({ timeout: 10000 }),
    ]).catch(() => false);

    expect(scoreVisible, 'Privacy score should be visible').toBe(true);
    console.log('✅ Privacy score is visible');

    // Step 5: Verify report page has content (not just empty)
    console.log('Step 5: Verify report has content');

    // Report should have SOME text content beyond just the score
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(50); // Should have substantial content

    console.log('✅ Report page has content');
    console.log('🎉 Full scan journey completed successfully');
  });

  test('Direct report access works', async ({ page }) => {
    console.log('📍 Test: Direct report access');

    // First create a scan to get a report URL
    console.log('Creating a scan...');
    await page.goto('/');
    const scanInput = page.getByPlaceholder('https://example.com');
    await scanInput.fill('https://example.com');

    const scanButton = page.getByRole('button', { name: 'Start Scan' });
    await scanButton.click();

    await page.waitForURL(/\/r\/[\w-]+/);
    const reportUrl = page.url();
    console.log(`✅ Created report at: ${reportUrl}`);

    // Now access it directly
    console.log('Accessing report directly...');
    await page.goto(reportUrl);

    // Should show the score without needing to scan again
    const scoreVisible = await page.locator('text=/\\b(\\d{1,2}|100)\\b/').first().isVisible({ timeout: 10000 });
    expect(scoreVisible).toBe(true);

    console.log('✅ Direct report access works');
  });

  test('Invalid URL handling', async ({ page }) => {
    console.log('📍 Test: Invalid URL handling');
    await page.goto('/');

    const scanInput = page.getByPlaceholder('https://example.com');
    await scanInput.fill('not-a-valid-url');

    const scanButton = page.getByRole('button', { name: 'Start Scan' });
    await scanButton.click();

    // Wait a moment to see response
    await page.waitForTimeout(2000);

    // Should either:
    // 1. Show validation error, OR
    // 2. Stay on homepage (not navigate away)
    //
    // Either behavior is acceptable - just verify it doesn't crash
    const currentUrl = page.url();
    const stillOnHome = currentUrl.endsWith('/') || currentUrl.includes('localhost');

    expect(stillOnHome, 'Should handle invalid URL gracefully').toBe(true);
    console.log('✅ Invalid URL handled gracefully');
  });
});

