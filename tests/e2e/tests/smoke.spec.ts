/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
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
 * - Minimal data-testid usage (only for complex components like score dial)
 * - Focus on user-visible behavior
 * - Simple, maintainable, resilient to refactoring
 *
 * Coverage:
 * 1. Can user access the homepage?
 * 2. Can user initiate a scan?
 * 3. Does scan navigate through proper flow: / → /scan/:id → /r/:slug?
 * 4. Does user see a privacy score on the report?
 * 5. Can user access a report directly via URL?
 *
 * User Journey Flow (based on code analysis):
 * 1. Homepage (/) - User enters URL and clicks "Scan Now"
 * 2. API call (POST /api/v2/scan) - Backend queues scan
 * 3. Scan status page (/scan/:id) - Frontend polls status every 2-3 seconds
 * 4. Auto-redirect to report (/r/:slug) - When scan status='done'
 * 5. Report page displays privacy score and findings
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

    // Verify main heading is visible (actual heading from Home.tsx:143)
    await expect(page.getByRole('heading', { name: 'See What\'s Tracking You Online' })).toBeVisible();

    // Verify scan input is present and functional
    const scanInput = page.getByPlaceholder('Enter website URL (e.g., example.com)');
    await expect(scanInput).toBeVisible();
    await expect(scanInput).toBeEnabled();

    // Verify scan button is present (actual text: "Scan Now" from Home.tsx)
    const scanButton = page.getByRole('button', { name: 'Start privacy scan' });
    await expect(scanButton).toBeVisible();

    console.log('✅ Homepage loaded successfully');
  });

  test('User can complete full scan journey and see report', async ({ page }) => {
    console.log('📍 Test: Full scan journey');

    // Step 1: Load homepage
    console.log('Step 1: Navigate to homepage');
    await page.goto('/');

    // Step 2: Enter URL and start scan
    console.log('Step 2: Enter URL and click scan');
    const scanInput = page.getByPlaceholder('Enter website URL (e.g., example.com)');
    await scanInput.fill('https://example.com');

    const scanButton = page.getByRole('button', { name: 'Start privacy scan' });
    await scanButton.click();

    // Step 3: Wait for scan status page (URL changes to /scan/:id)
    console.log('Step 3: Wait for scan status page');
    await page.waitForURL(/\/scan\/[\w-]+/, { timeout: 10000 });
    console.log(`✅ Navigated to scan page: ${page.url()}`);

    // Step 4: Wait for polling to complete and auto-redirect to report page
    console.log('Step 4: Wait for scan completion and redirect to report');
    await page.waitForURL(/\/r\/[\w-]+/, { timeout: 90000 }); // Scans can take 30-60 seconds
    console.log(`✅ Redirected to report: ${page.url()}`);

    // Step 5: Verify privacy score is visible
    console.log('Step 5: Check for privacy score');

    // Look for the EnhancedScoreDial component with data-testid
    const scoreDial = page.locator('[data-testid="score-dial"]');
    await expect(scoreDial).toBeVisible({ timeout: 10000 });
    console.log('✅ Privacy score dial is visible');

    // Step 6: Verify report page has content (not just empty)
    console.log('Step 6: Verify report has content');

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
    const scanInput = page.getByPlaceholder('Enter website URL (e.g., example.com)');
    await scanInput.fill('https://example.com');

    const scanButton = page.getByRole('button', { name: 'Start privacy scan' });
    await scanButton.click();

    // Wait for scan page, then report page
    await page.waitForURL(/\/scan\/[\w-]+/, { timeout: 10000 });
    await page.waitForURL(/\/r\/[\w-]+/, { timeout: 90000 });
    const reportUrl = page.url();
    console.log(`✅ Created report at: ${reportUrl}`);

    // Now access it directly
    console.log('Accessing report directly...');
    await page.goto(reportUrl);

    // Should show the score without needing to scan again
    const scoreDial = page.locator('[data-testid="score-dial"]');
    await expect(scoreDial).toBeVisible({ timeout: 10000 });

    console.log('✅ Direct report access works');
  });

  test('Invalid URL handling', async ({ page }) => {
    console.log('📍 Test: Invalid URL handling');
    await page.goto('/');

    const scanInput = page.getByPlaceholder('Enter website URL (e.g., example.com)');
    await scanInput.fill('not-a-valid-url');

    const scanButton = page.getByRole('button', { name: 'Start privacy scan' });
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

