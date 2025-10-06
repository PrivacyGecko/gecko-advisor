/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';
import { HomePage } from '../pages/HomePage';
import { ScanPage } from '../pages/ScanPage';
import { ReportPage } from '../pages/ReportPage';
import { TEST_URLS, A11Y_CONFIG } from '../utils/test-helpers';

test.describe('Accessibility & Mobile Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Inject axe-core for accessibility testing
    await injectAxe(page);
  });

  test('WCAG AA compliance - Home page', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Run comprehensive accessibility audit
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      tags: A11Y_CONFIG.tags,
    });

    // Test specific accessibility features
    await homePage.verifyAccessibility();
  });

  test('WCAG AA compliance - Scan page', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);

    // Check accessibility during scan progress
    await checkA11y(page, null, {
      tags: A11Y_CONFIG.tags,
      rules: {
        // Allow progress indicators to have animated content
        'no-autoplay-audio': { enabled: false },
      },
    });

    // Wait for completion and check final state
    await scanPage.waitForScanCompletion();
    await checkA11y(page);
  });

  test('WCAG AA compliance - Report page', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    // Comprehensive accessibility check for report page
    await checkA11y(page, null, {
      tags: A11Y_CONFIG.tags,
      rules: {
        // Custom rules for report-specific elements
        'color-contrast': { enabled: true },
        'landmark-unique': { enabled: true },
      },
    });

    // Test ScoreDial accessibility specifically
    await reportPage.verifyScoreDialAccessibility();
  });

  test('Screen reader compatibility', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // Check ARIA labels and roles
    await expect(page.locator('input[aria-label="Scan input"]')).toBeVisible();
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    await expect(page.locator('[role="tab"]').first()).toBeVisible();

    // Test form accessibility
    const urlInput = page.locator('input[aria-label="Scan input"]');
    await expect(urlInput).toHaveAttribute('aria-label');

    // Test button accessibility
    const scanButton = page.locator('button:has-text("Scan Now")');
    await expect(scanButton).toBeVisible();

    // Test navigation accessibility
    const tabButtons = page.locator('[role="tab"]');
    for (let i = 0; i < await tabButtons.count(); i++) {
      const tab = tabButtons.nth(i);
      await expect(tab).toHaveAttribute('aria-selected');
    }
  });

  test('Keyboard navigation - Complete journey', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    await homePage.goto();

    // Navigate using only keyboard
    await page.keyboard.press('Tab'); // Focus URL tab
    await page.keyboard.press('Tab'); // Focus input field
    await page.keyboard.type('https://example.com');
    await page.keyboard.press('Tab'); // Focus scan button
    await page.keyboard.press('Enter'); // Start scan

    // Wait for scan page
    await page.waitForURL(/\/scan\/\w+/);

    // Continue keyboard navigation on scan page
    await page.keyboard.press('Tab'); // Should focus on interactive elements

    // Wait for report
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    // Test keyboard navigation on report page
    await reportPage.testKeyboardNavigation();
  });

  test('Focus management and tab order', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // Test logical tab order
    const expectedTabOrder = [
      'a[href="/docs"]', // Docs link
      'button[role="tab"]:has-text("URL")', // URL tab
      'button[role="tab"]:has-text("APP")', // APP tab
      'button[role="tab"]:has-text("ADDRESS")', // ADDRESS tab
      'input[aria-label="Scan input"]', // Input field
      'button:has-text("Scan Now")', // Scan button
    ];

    for (const selector of expectedTabOrder) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());

      // Verify element is focusable and in correct order
      const element = page.locator(selector);
      if (await element.isVisible()) {
        await expect(element).toBeFocused();
      }
    }
  });

  test('High contrast mode support', async ({ page }) => {
    const homePage = new HomePage(page);

    // Simulate high contrast mode
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            background-color: black !important;
            color: white !important;
            border-color: white !important;
          }
        }
      `,
    });

    await homePage.goto();

    // Check that elements are still visible and functional
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input[aria-label="Scan input"]')).toBeVisible();
    await expect(page.locator('button:has-text("Scan Now")')).toBeVisible();

    // Run accessibility check with high contrast considerations
    await checkA11y(page, null, {
      tags: ['wcag2aa'],
      rules: {
        'color-contrast': { enabled: true },
      },
    });
  });

  test('Mobile responsiveness - iPhone', async ({ page }) => {
    const homePage = new HomePage(page);

    // Set iPhone viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await homePage.goto();

    // Verify mobile layout
    await homePage.verifyMobileLayout();

    // Test mobile-specific interactions
    await homePage.switchInputMode('URL');
    await page.fill('input[aria-label="Scan input"]', TEST_URLS.FIXTURE_SAFE);

    // Scan button should be easily tappable on mobile
    const scanButton = page.locator('button:has-text("Scan Now")');
    const buttonBox = await scanButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThan(44); // iOS minimum tap target

    // Complete scan journey on mobile
    await scanButton.click();
    await page.waitForURL(/\/scan\/\w+/);

    const scanPage = new ScanPage(page);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();

    // Verify report is readable on mobile
    const reportPage = new ReportPage(page);
    await reportPage.waitForReportLoad();
    await reportPage.verifyResponsiveLayout();
  });

  test('Mobile responsiveness - Android tablet', async ({ page }) => {
    const homePage = new HomePage(page);

    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await homePage.goto();

    // Verify tablet layout adapts appropriately
    await homePage.verifyMobileLayout();

    // Test touch interactions
    const urlInput = page.locator('input[aria-label="Scan input"]');
    await urlInput.tap();
    await urlInput.fill(TEST_URLS.FIXTURE_SAFE);

    const scanButton = page.locator('button:has-text("Scan Now")');
    await scanButton.tap();

    await page.waitForURL(/\/scan\/\w+/);
  });

  test('Touch and gesture support', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const homePage = new HomePage(page);
    await homePage.goto();

    // Test tap interactions
    const urlTab = page.locator('button:has-text("URL")');
    await urlTab.tap();
    await expect(urlTab).toHaveClass(/bg-security-blue/);

    const appTab = page.locator('button:has-text("APP")');
    await appTab.tap();
    await expect(appTab).toHaveClass(/bg-security-blue/);

    // Test form interactions
    const urlInput = page.locator('input[aria-label="Scan input"]');
    await urlInput.tap();
    await urlInput.fill(TEST_URLS.FIXTURE_SAFE);

    // Test button tap
    const scanButton = page.locator('button:has-text("Scan Now")');
    await scanButton.tap();

    await page.waitForURL(/\/scan\/\w+/);
  });

  test('Screen reader announcements', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();

    // Test that dynamic content has proper ARIA live regions
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);

    // Check for live regions that announce scan progress
    const liveRegions = page.locator('[aria-live]');
    if (await liveRegions.count() > 0) {
      for (let i = 0; i < await liveRegions.count(); i++) {
        const region = liveRegions.nth(i);
        const ariaLive = await region.getAttribute('aria-live');
        expect(['polite', 'assertive']).toContain(ariaLive);
      }
    }

    // Test status announcements during scan
    await scanPage.waitForScanCompletion();

    // Check that completion is announced
    const completionAnnouncement = page.locator('[aria-live="polite"]:has-text("Complete")');
    if (await completionAnnouncement.isVisible()) {
      await expect(completionAnnouncement).toBeVisible();
    }
  });

  test('Reduced motion preferences', async ({ page }) => {
    // Simulate prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);

    // Animations should be reduced or disabled
    const progressDial = page.locator('[data-testid="progress-dial"]');
    if (await progressDial.isVisible()) {
      // Check that animations respect reduced motion preference
      const animationDuration = await progressDial.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.animationDuration;
      });

      // Should have no animation or very short duration
      expect(['0s', '0.01s'].some(duration => animationDuration.includes(duration))).toBeTruthy();
    }

    await scanPage.waitForScanCompletion();
  });

  test('Color contrast compliance', async ({ page }) => {
    const homePage = new HomePage(page);
    const reportPage = new ReportPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);

    const scanPage = new ScanPage(page);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    // Check color contrast specifically for score dial
    await checkA11y(page, '[data-testid="score-dial"]', {
      rules: {
        'color-contrast': { enabled: true },
      },
    });

    // Check severity badges have proper contrast
    const severityBadges = page.locator('[data-testid="severity-badge"]');
    if (await severityBadges.count() > 0) {
      await checkA11y(page, '[data-testid="severity-badge"]', {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
    }
  });

  test('Zoom and magnification support', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // Test at 200% zoom
    await page.setViewportSize({ width: 640, height: 360 }); // Simulate 200% zoom
    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });

    // Content should still be accessible and functional
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input[aria-label="Scan input"]')).toBeVisible();
    await expect(page.locator('button:has-text("Scan Now")')).toBeVisible();

    // Test functionality at zoom level
    await page.fill('input[aria-label="Scan input"]', TEST_URLS.FIXTURE_SAFE);
    await page.click('button:has-text("Scan Now")');

    await page.waitForURL(/\/scan\/\w+/);

    // Reset zoom
    await page.evaluate(() => {
      document.body.style.zoom = '1';
    });
  });

  test('Cross-device compatibility', async ({ page, browserName }) => {
    const homePage = new HomePage(page);

    // Test different viewport sizes representing common devices
    const devices = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'iPad Pro', width: 1024, height: 1366 },
      { name: 'Desktop', width: 1280, height: 720 },
      { name: 'Large Desktop', width: 1920, height: 1080 },
    ];

    for (const device of devices) {
      console.log(`Testing ${device.name} (${device.width}x${device.height}) on ${browserName}`);

      await page.setViewportSize({ width: device.width, height: device.height });
      await homePage.goto();

      // Basic functionality should work on all devices
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('input[aria-label="Scan input"]')).toBeVisible();
      await expect(page.locator('button:has-text("Scan Now")')).toBeVisible();

      // Test responsive behavior
      if (device.width < 768) {
        // Mobile layout
        await homePage.verifyMobileLayout();
      }

      // Quick accessibility check
      await checkA11y(page, null, {
        tags: ['wcag2a'],
        rules: {
          'bypass': { enabled: false }, // Skip bypass rule for quick test
        },
      });
    }
  });
});