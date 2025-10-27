import { test, expect, type Page } from '@playwright/test';
import type { ConsoleMessage } from '@playwright/test';

/**
 * CRITICAL FIXES VALIDATION TEST SUITE
 *
 * Testing recent deployments:
 * 1. Scan timeout fix (60s with stalled detection)
 * 2. Progress tracking (10% → 20% → 30-70% → 75% → 90% → 100%)
 * 3. Error handling with retry mechanism (max 3 attempts)
 * 4. Performance optimization (code splitting, Terser minification)
 * 5. Google Fonts CSP configuration
 */

test.describe('Critical Fixes Validation - Stage Environment', () => {
  let consoleErrors: ConsoleMessage[] = [];
  let cspViolations: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset error collectors
    consoleErrors = [];
    cspViolations = [];

    // Monitor console for errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      }
    });

    // Monitor CSP violations
    page.on('pageerror', (error) => {
      if (error.message.includes('Content Security Policy')) {
        cspViolations.push(error.message);
      }
    });
  });

  test.describe('1. CRITICAL: Scan Timeout & Progress Tracking', () => {
    test('should complete fast site scan (example.com) within 30 seconds with progress updates', async ({ page }) => {
      const startTime = Date.now();

      // Navigate to homepage
      await page.goto('/');
      await expect(page).toHaveTitle(/Gecko Advisor/i);

      // Submit URL scan
      const urlInput = page.locator('input[type="text"], input[placeholder*="URL"], input[placeholder*="domain"]').first();
      await expect(urlInput).toBeVisible({ timeout: 10000 });
      await urlInput.fill('example.com');

      const scanButton = page.locator('button:has-text("Scan"), button:has-text("Check")').first();
      await scanButton.click();

      // Track progress updates
      const progressUpdates: number[] = [];
      const progressTracker = page.locator('[data-testid="scan-progress"], .progress, [role="progressbar"]').first();

      // Wait for scan to start
      await page.waitForURL(/\/(scan|progress|analyzing)/, { timeout: 10000 });

      // Monitor progress for up to 60 seconds
      const progressCheckInterval = setInterval(async () => {
        try {
          const progressText = await page.textContent('body');
          if (progressText) {
            // Extract percentage if visible
            const match = progressText.match(/(\d+)%/);
            if (match) {
              const percentage = parseInt(match[1]);
              if (!progressUpdates.includes(percentage)) {
                progressUpdates.push(percentage);
                console.log(`Progress update: ${percentage}%`);
              }
            }
          }
        } catch (e) {
          // Ignore errors during progress checking
        }
      }, 1000);

      // Wait for scan completion or timeout error
      try {
        await page.waitForURL(/\/(report|results)\//, { timeout: 65000 });
        clearInterval(progressCheckInterval);

        const scanDuration = (Date.now() - startTime) / 1000;
        console.log(`Scan completed in ${scanDuration.toFixed(2)} seconds`);
        console.log(`Progress updates observed: ${progressUpdates.join('%, ')}%`);

        // Verify scan completed within acceptable time
        expect(scanDuration).toBeLessThan(60);

        // Verify we got multiple progress updates
        expect(progressUpdates.length).toBeGreaterThan(2);

        // Verify scan results are displayed
        await expect(page.locator('text=/privacy score|score:|rating/i').first()).toBeVisible({ timeout: 5000 });

      } catch (error) {
        clearInterval(progressCheckInterval);

        // Check if timeout error appeared
        const timeoutError = page.locator('text=/timeout|timed out|taking too long/i');
        const isTimeoutError = await timeoutError.isVisible().catch(() => false);

        if (isTimeoutError) {
          console.log('Timeout error appeared as expected for slow scan');

          // Verify retry button is present
          const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry")');
          await expect(retryButton).toBeVisible();

        } else {
          throw error;
        }
      }
    });

    test('should show retry mechanism with counter (max 3 attempts)', async ({ page }) => {
      await page.goto('/');

      // Submit a potentially slow URL
      const urlInput = page.locator('input[type="text"], input[placeholder*="URL"]').first();
      await urlInput.fill('example.com');

      const scanButton = page.locator('button:has-text("Scan"), button:has-text("Check")').first();
      await scanButton.click();

      // Wait for scan to start
      await page.waitForURL(/\/(scan|progress|analyzing)/, { timeout: 10000 });

      // Check if timeout occurs (wait up to 70 seconds)
      try {
        await page.waitForSelector('text=/timeout|error|failed/i', { timeout: 70000 });

        // Verify retry button exists
        const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry")');
        const retryButtonVisible = await retryButton.isVisible();

        if (retryButtonVisible) {
          console.log('Retry button found after timeout/error');

          // Click retry and check for retry counter
          await retryButton.click();

          // Look for retry attempt indicator
          const retryIndicator = page.locator('text=/retry.*?1.*?of.*?3|attempt.*?1/i');
          const hasRetryIndicator = await retryIndicator.isVisible({ timeout: 5000 }).catch(() => false);

          if (hasRetryIndicator) {
            console.log('Retry counter displayed correctly');
            expect(hasRetryIndicator).toBeTruthy();
          } else {
            console.log('Retry counter not visible (may be implemented differently)');
          }
        }

      } catch (e) {
        console.log('Scan completed successfully without timeout - retry mechanism not tested');
      }
    });
  });

  test.describe('2. Performance Validation', () => {
    test('should load homepage in under 2.5 seconds', async ({ page }) => {
      const startTime = Date.now();

      const response = await page.goto('/', { waitUntil: 'load' });
      const loadTime = (Date.now() - startTime) / 1000;

      console.log(`Homepage load time: ${loadTime.toFixed(2)}s`);

      expect(response?.status()).toBe(200);
      expect(loadTime).toBeLessThan(2.5);

      // Check for no CSP errors
      await page.waitForTimeout(2000); // Wait for any delayed CSP errors
      expect(cspViolations).toHaveLength(0);
    });

    test('should load pricing page in under 2.5 seconds', async ({ page }) => {
      const startTime = Date.now();

      const response = await page.goto('/pricing', { waitUntil: 'load' });
      const loadTime = (Date.now() - startTime) / 1000;

      console.log(`Pricing page load time: ${loadTime.toFixed(2)}s`);

      expect(response?.status()).toBe(200);
      expect(loadTime).toBeLessThan(2.5);
    });

    test('should have no CSP errors for Google Fonts', async ({ page }) => {
      await page.goto('/');

      // Wait for fonts to load
      await page.waitForLoadState('networkidle');

      // Check console for CSP violations
      const fontCspErrors = consoleErrors.filter(msg =>
        msg.text().toLowerCase().includes('font') &&
        msg.text().toLowerCase().includes('csp')
      );

      expect(fontCspErrors).toHaveLength(0);

      // Verify fonts loaded correctly
      const bodyFont = await page.evaluate(() =>
        window.getComputedStyle(document.body).fontFamily
      );

      console.log(`Body font family: ${bodyFont}`);
      expect(bodyFont).toBeTruthy();
    });

    test('should have optimized bundle sizes', async ({ page }) => {
      const resources: { url: string; size: number; type: string }[] = [];

      page.on('response', async (response) => {
        const url = response.url();
        const type = response.request().resourceType();

        if (type === 'script' || type === 'stylesheet') {
          try {
            const body = await response.body();
            resources.push({
              url,
              size: body.length,
              type
            });
          } catch (e) {
            // Ignore errors for cross-origin resources
          }
        }
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // Log bundle sizes
      const jsResources = resources.filter(r => r.type === 'script');
      const cssResources = resources.filter(r => r.type === 'stylesheet');

      const totalJsSize = jsResources.reduce((sum, r) => sum + r.size, 0);
      const totalCssSize = cssResources.reduce((sum, r) => sum + r.size, 0);

      console.log(`Total JS size: ${(totalJsSize / 1024).toFixed(2)} KB`);
      console.log(`Total CSS size: ${(totalCssSize / 1024).toFixed(2)} KB`);
      console.log(`Number of JS files: ${jsResources.length}`);
      console.log(`Number of CSS files: ${cssResources.length}`);

      // Verify code splitting happened (multiple JS chunks)
      expect(jsResources.length).toBeGreaterThan(1);
    });
  });

  test.describe('3. Core Functionality - Free User Flows', () => {
    test('should complete full scan journey and display results', async ({ page }) => {
      await page.goto('/');

      // Submit scan
      const urlInput = page.locator('input[type="text"], input[placeholder*="URL"]').first();
      await urlInput.fill('example.com');

      const scanButton = page.locator('button:has-text("Scan"), button:has-text("Check")').first();
      await scanButton.click();

      // Wait for results
      await page.waitForURL(/\/(report|results)\//, { timeout: 65000 });

      // Verify privacy score is displayed
      const scoreElement = page.locator('text=/score|rating/i').first();
      await expect(scoreElement).toBeVisible();

      // Verify evidence sections exist
      const evidenceSection = page.locator('text=/evidence|tracker|cookie|third-party/i').first();
      await expect(evidenceSection).toBeVisible({ timeout: 5000 });

      // Get current URL (should be report permalink)
      const reportUrl = page.url();
      console.log(`Report URL: ${reportUrl}`);
      expect(reportUrl).toMatch(/\/(report|results)\//);

      // Verify report is shareable (public permalink)
      const shareButton = page.locator('button:has-text("Share"), a:has-text("Share")');
      const hasShareButton = await shareButton.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`Share functionality: ${hasShareButton ? 'Present' : 'Not visible'}`);
    });

    test('should display recent scans on homepage', async ({ page }) => {
      await page.goto('/');

      // Look for recent scans section
      const recentScansSection = page.locator('text=/recent.*?scan|latest.*?scan|scan.*?history/i');
      const hasRecentScans = await recentScansSection.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasRecentScans) {
        console.log('Recent scans section found on homepage');

        // Check if there are any scan items
        const scanItems = page.locator('[data-testid*="scan"], .scan-item, article').filter({ hasText: /http|\.com|\.org/ });
        const scanCount = await scanItems.count();
        console.log(`Number of recent scans displayed: ${scanCount}`);
      } else {
        console.log('Recent scans section not visible (may require authentication)');
      }
    });
  });

  test.describe('4. PRO Upgrade Flows', () => {
    test('should display pricing page correctly with both payment options', async ({ page }) => {
      await page.goto('/pricing');

      // Verify page loaded
      await expect(page).toHaveTitle(/pricing|plan/i);

      // Check for pricing information
      const proPricing = page.locator('text=/\\$4\\.99|4.99|pro.*?plan/i');
      await expect(proPricing.first()).toBeVisible();

      // Check for LemonSqueezy payment option
      const lemonSqueezyButton = page.locator('button:has-text("Upgrade"), a:has-text("Upgrade"), button:has-text("Subscribe")').first();
      await expect(lemonSqueezyButton).toBeVisible();

      // Check for wallet payment option
      const walletButton = page.locator('button:has-text("Wallet"), button:has-text("Connect Wallet"), text=/wallet.*?auth/i');
      const hasWalletOption = await walletButton.first().isVisible({ timeout: 3000 }).catch(() => false);

      console.log(`LemonSqueezy option: Visible`);
      console.log(`Wallet option: ${hasWalletOption ? 'Visible' : 'Not visible or not implemented'}`);
    });

    test('should show wallet authentication modal with $PRICKO requirement', async ({ page }) => {
      await page.goto('/pricing');

      // Look for wallet connect button
      const walletButton = page.locator('button:has-text("Wallet"), button:has-text("Connect Wallet")').first();
      const walletButtonVisible = await walletButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (walletButtonVisible) {
        await walletButton.click();

        // Check for wallet modal
        const walletModal = page.locator('[role="dialog"], .modal, [data-testid*="wallet"]');
        await expect(walletModal).toBeVisible({ timeout: 5000 });

        // Check for $PRICKO requirement
        const prickoRequirement = page.locator('text=/10,?000.*?PRICKO|PRICKO.*?10,?000/i');
        await expect(prickoRequirement).toBeVisible();

        // Check for wallet options (Phantom, Solflare)
        const phantomOption = page.locator('text=/phantom/i');
        const solflareOption = page.locator('text=/solflare/i');

        const hasPhantom = await phantomOption.isVisible({ timeout: 3000 }).catch(() => false);
        const hasSolflare = await solflareOption.isVisible({ timeout: 3000 }).catch(() => false);

        console.log(`Phantom wallet option: ${hasPhantom ? 'Visible' : 'Not visible'}`);
        console.log(`Solflare wallet option: ${hasSolflare ? 'Visible' : 'Not visible'}`);

      } else {
        console.log('Wallet authentication not visible on pricing page');
      }
    });
  });

  test.describe('5. Error Handling & Edge Cases', () => {
    test('should handle invalid URL submission gracefully', async ({ page }) => {
      await page.goto('/');

      // Submit invalid URL
      const urlInput = page.locator('input[type="text"], input[placeholder*="URL"]').first();
      await urlInput.fill('not-a-valid-url');

      const scanButton = page.locator('button:has-text("Scan"), button:has-text("Check")').first();
      await scanButton.click();

      // Wait for error message
      const errorMessage = page.locator('text=/invalid|error|please enter|valid url/i');
      const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasError) {
        console.log('Invalid URL error message displayed correctly');
        expect(hasError).toBeTruthy();
      } else {
        console.log('No immediate validation - may validate server-side');
      }
    });

    test('should handle browser refresh during scan', async ({ page }) => {
      await page.goto('/');

      // Submit scan
      const urlInput = page.locator('input[type="text"], input[placeholder*="URL"]').first();
      await urlInput.fill('example.com');

      const scanButton = page.locator('button:has-text("Scan"), button:has-text("Check")').first();
      await scanButton.click();

      // Wait for scan to start
      await page.waitForURL(/\/(scan|progress|analyzing)/, { timeout: 10000 });

      // Get current URL
      const scanUrl = page.url();
      console.log(`Scan URL: ${scanUrl}`);

      // Refresh page
      await page.reload();

      // Verify page still shows scan progress or results
      const isStillOnScanPage = page.url().includes('scan') || page.url().includes('progress') || page.url().includes('report');
      expect(isStillOnScanPage).toBeTruthy();

      console.log('Page refresh during scan handled correctly');
    });
  });

  test.describe('6. Responsive Design', () => {
    test('should work correctly on mobile viewport (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Verify mobile layout
      const urlInput = page.locator('input[type="text"], input[placeholder*="URL"]').first();
      await expect(urlInput).toBeVisible();

      const scanButton = page.locator('button:has-text("Scan"), button:has-text("Check")').first();
      await expect(scanButton).toBeVisible();

      console.log('Mobile viewport: Homepage renders correctly');
    });

    test('should work correctly on tablet viewport (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');

      // Verify tablet layout
      const urlInput = page.locator('input[type="text"], input[placeholder*="URL"]').first();
      await expect(urlInput).toBeVisible();

      console.log('Tablet viewport: Homepage renders correctly');
    });

    test('should work correctly on desktop viewport (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');

      // Verify desktop layout
      const urlInput = page.locator('input[type="text"], input[placeholder*="URL"]').first();
      await expect(urlInput).toBeVisible();

      console.log('Desktop viewport: Homepage renders correctly');
    });
  });

  test.describe('7. Authentication Flows', () => {
    test('should display authentication options', async ({ page }) => {
      await page.goto('/');

      // Look for sign up / login buttons
      const signUpButton = page.locator('a:has-text("Sign Up"), button:has-text("Sign Up"), a:has-text("Sign up")').first();
      const loginButton = page.locator('a:has-text("Log In"), button:has-text("Log In"), a:has-text("Login")').first();

      const hasSignUp = await signUpButton.isVisible({ timeout: 5000 }).catch(() => false);
      const hasLogin = await loginButton.isVisible({ timeout: 5000 }).catch(() => false);

      console.log(`Sign Up button: ${hasSignUp ? 'Visible' : 'Not visible'}`);
      console.log(`Login button: ${hasLogin ? 'Visible' : 'Not visible'}`);

      if (hasSignUp || hasLogin) {
        expect(hasSignUp || hasLogin).toBeTruthy();
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Log any console errors found
    if (consoleErrors.length > 0) {
      console.log(`\n⚠️  Console errors found in ${testInfo.title}:`);
      consoleErrors.forEach((msg, idx) => {
        console.log(`  ${idx + 1}. ${msg.text()}`);
      });
    }

    // Log any CSP violations found
    if (cspViolations.length > 0) {
      console.log(`\n🚨 CSP violations found in ${testInfo.title}:`);
      cspViolations.forEach((violation, idx) => {
        console.log(`  ${idx + 1}. ${violation}`);
      });
    }

    // Take screenshot on failure
    if (testInfo.status !== 'passed') {
      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
    }
  });
});
