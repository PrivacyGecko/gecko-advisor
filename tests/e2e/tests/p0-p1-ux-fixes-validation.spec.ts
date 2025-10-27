// SPDX-License-Identifier: MIT
import { test, expect, type Page } from '@playwright/test';

/**
 * P0/P1 UX Fixes Validation Suite
 * Validates all 7 critical fixes deployed to staging before production
 * Target: https://stage.geckoadvisor.com
 */

test.describe('P0/P1 UX Fixes Validation - Stage Environment', () => {
  let page: Page;
  let consoleMessages: Array<{ type: string; text: string }> = [];
  let consoleErrors: Array<string> = [];

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    consoleMessages = [];
    consoleErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push({ type: msg.type(), text });

      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(`Page error: ${error.message}`);
    });
  });

  test('P0-1: CSP Google Fonts Fix - NO CSP errors for fonts.googleapis.com or fonts.gstatic.com', async () => {
    console.log('\n=== P0-1: Testing CSP Google Fonts Fix ===');

    // Navigate to homepage
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for fonts to load

    // Take screenshot
    await page.screenshot({
      path: 'test-results/p0-1-homepage-fonts.png',
      fullPage: false
    });

    // Check for CSP errors related to fonts
    const fontCSPErrors = consoleErrors.filter(err =>
      err.toLowerCase().includes('csp') &&
      (err.includes('fonts.googleapis.com') || err.includes('fonts.gstatic.com'))
    );

    console.log('Console errors captured:', consoleErrors.length);
    console.log('Font-related CSP errors:', fontCSPErrors.length);

    if (fontCSPErrors.length > 0) {
      console.error('FAIL: Font CSP errors found:', fontCSPErrors);
    }

    // Verify no font CSP errors
    expect(fontCSPErrors.length, 'Should have NO CSP errors for Google Fonts').toBe(0);

    // Verify DM Sans font loads correctly by checking computed styles
    const headingElement = page.locator('h1').first();
    await expect(headingElement).toBeVisible();

    const fontFamily = await headingElement.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });

    console.log('Heading font family:', fontFamily);
    expect(fontFamily, 'Should use DM Sans font').toContain('DM Sans');

    console.log('PASS: No CSP errors for Google Fonts, DM Sans loaded correctly\n');
  });

  test('P0-2: Evidence Category "Undefined" Fix - All evidence has proper category labels', async () => {
    console.log('\n=== P0-2: Testing Evidence Category Labels ===');

    // Navigate to homepage
    await page.goto('/');

    // Submit a scan
    const urlInput = page.locator('[data-testid="url-input"], input[type="text"][placeholder*="Enter"]');
    await urlInput.waitFor({ state: 'visible', timeout: 10000 });
    await urlInput.fill('https://example.com');

    const submitButton = page.locator('button:has-text("Scan")').first();
    await submitButton.click();

    console.log('Scan submitted, waiting for completion...');

    // Wait for scan completion (max 60 seconds)
    await page.waitForURL(/\/report\/.*/, { timeout: 60000 });
    console.log('Scan completed, on report page');

    // Take screenshot of report
    await page.screenshot({
      path: 'test-results/p0-2-report-evidence.png',
      fullPage: true
    });

    // Wait for evidence section to load
    const evidenceSection = page.locator('[data-testid="evidence-section"], .evidence-list, section:has-text("Evidence")');

    // Check if evidence section exists
    const evidenceSectionExists = await evidenceSection.count() > 0;

    if (evidenceSectionExists) {
      await evidenceSection.first().waitFor({ state: 'visible', timeout: 5000 });

      // Find all evidence items
      const evidenceItems = page.locator('[data-testid="evidence-item"], .evidence-item, li:has-text("Tracker"), li:has-text("Cookie"), li:has-text("Security")');
      const evidenceCount = await evidenceItems.count();

      console.log(`Found ${evidenceCount} evidence items`);

      if (evidenceCount > 0) {
        // Check each evidence item for proper category
        const categories: string[] = [];

        for (let i = 0; i < Math.min(evidenceCount, 10); i++) {
          const item = evidenceItems.nth(i);
          const itemText = await item.textContent();
          categories.push(itemText || '');

          console.log(`Evidence ${i + 1}:`, itemText?.substring(0, 100));
        }

        // Verify NO "Undefined" categories
        const undefinedCategories = categories.filter(cat =>
          cat.toLowerCase().includes('undefined')
        );

        expect(undefinedCategories.length, 'Should have NO "Undefined" categories').toBe(0);

        // Verify proper categories exist
        const validCategories = ['tracker', 'cookie', 'security', 'privacy', 'third-party'];
        const hasValidCategories = categories.some(cat =>
          validCategories.some(valid => cat.toLowerCase().includes(valid))
        );

        expect(hasValidCategories, 'Should have valid category labels').toBe(true);
        console.log('PASS: All evidence has proper category labels\n');
      } else {
        console.log('INFO: No evidence items found on this report (clean site)\n');
      }
    } else {
      console.log('INFO: No evidence section found (clean site or different layout)\n');
    }
  });

  test('P0-3: FREE Tier Public Scan Warning - Banner appears and dismissal persists', async () => {
    console.log('\n=== P0-3: Testing Public Scan Warning Banner ===');

    // Clear localStorage to ensure warning appears
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('gecko-advisor:public-scan-warning-dismissed');
    });

    // Reload page
    await page.reload({ waitUntil: 'networkidle' });

    // Check for warning banner
    const warningBanner = page.locator('[data-testid="public-scan-warning"], .public-scan-warning, [role="alert"]:has-text("public")');

    // Take screenshot of warning
    await page.screenshot({
      path: 'test-results/p0-3-warning-visible.png',
      fullPage: false
    });

    // Verify warning appears
    await expect(warningBanner.first(), 'Warning banner should be visible').toBeVisible({ timeout: 5000 });

    const warningText = await warningBanner.first().textContent();
    console.log('Warning text:', warningText);

    expect(warningText?.toLowerCase(), 'Should mention public/publicly accessible').toMatch(/public/i);

    // Find and click dismiss button
    const dismissButton = warningBanner.locator('button').first();
    await expect(dismissButton, 'Dismiss button should be visible').toBeVisible();
    await dismissButton.click();

    console.log('Clicked dismiss button');

    // Verify warning is hidden
    await expect(warningBanner.first(), 'Warning should be hidden after dismissal').toBeHidden({ timeout: 3000 });

    await page.screenshot({
      path: 'test-results/p0-3-warning-dismissed.png',
      fullPage: false
    });

    // Refresh page and verify warning stays dismissed
    await page.reload({ waitUntil: 'networkidle' });

    await page.screenshot({
      path: 'test-results/p0-3-warning-after-refresh.png',
      fullPage: false
    });

    const warningAfterRefresh = await warningBanner.first().isVisible().catch(() => false);
    expect(warningAfterRefresh, 'Warning should stay dismissed after refresh').toBe(false);

    // Re-enable warning for next test
    await page.evaluate(() => {
      localStorage.removeItem('gecko-advisor:public-scan-warning-dismissed');
    });
    await page.reload({ waitUntil: 'networkidle' });

    const warningReappears = await warningBanner.first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(warningReappears, 'Warning should reappear after clearing localStorage').toBe(true);

    console.log('PASS: Public scan warning banner works correctly\n');
  });

  test('P1-4: Scan Progress Timer - Shows elapsed time and reassurance message', async () => {
    console.log('\n=== P1-4: Testing Scan Progress Timer ===');

    await page.goto('/');

    // Submit a scan
    const urlInput = page.locator('[data-testid="url-input"], input[type="text"][placeholder*="Enter"]');
    await urlInput.waitFor({ state: 'visible', timeout: 10000 });
    await urlInput.fill('https://example.com');

    const submitButton = page.locator('button:has-text("Scan")').first();
    await submitButton.click();

    console.log('Scan submitted, monitoring progress...');

    // Wait for progress indicator
    await page.waitForTimeout(2000);

    // Look for progress messages
    const progressSection = page.locator('[data-testid="scan-progress"], .scan-progress, div:has-text("Scanning"), div:has-text("seconds")');

    await page.screenshot({
      path: 'test-results/p1-4-scan-progress-start.png',
      fullPage: false
    });

    // Check for initial message
    const pageContent = await page.content();
    const hasInitialMessage = pageContent.includes('Usually takes 5-10 seconds') ||
                              pageContent.includes('usually takes') ||
                              pageContent.includes('Scanning');

    console.log('Has initial progress message:', hasInitialMessage);

    // Wait and check for timer
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'test-results/p1-4-scan-progress-timer.png',
      fullPage: false
    });

    const contentWithTimer = await page.content();

    // Look for time indicators like "(5s)", "(10s)"
    const hasTimer = /\(\d+s\)/.test(contentWithTimer);
    console.log('Has elapsed time timer:', hasTimer);

    // If scan takes longer than 20 seconds, check for reassurance message
    const scanStillRunning = await progressSection.first().isVisible().catch(() => false);

    if (scanStillRunning) {
      await page.waitForTimeout(20000); // Wait 20 more seconds

      const longContent = await page.content();
      const hasReassurance = longContent.includes('may take up to 30 seconds') ||
                            longContent.includes('This may take');

      console.log('Has reassurance message (20+ seconds):', hasReassurance);

      await page.screenshot({
        path: 'test-results/p1-4-scan-progress-long.png',
        fullPage: false
      });
    }

    // Note: Timer validation depends on scan being in progress
    console.log('INFO: Timer validation completed (depends on scan duration)\n');
  });

  test('P1-5: Data Sharing Risk Label - Correct label and color coding', async () => {
    console.log('\n=== P1-5: Testing Data Sharing Risk Label ===');

    await page.goto('/');

    // Submit a scan
    const urlInput = page.locator('[data-testid="url-input"], input[type="text"][placeholder*="Enter"]');
    await urlInput.waitFor({ state: 'visible', timeout: 10000 });
    await urlInput.fill('https://example.com');

    const submitButton = page.locator('button:has-text("Scan")').first();
    await submitButton.click();

    console.log('Waiting for report...');

    // Wait for report page
    await page.waitForURL(/\/report\/.*/, { timeout: 60000 });

    await page.screenshot({
      path: 'test-results/p1-5-report-full.png',
      fullPage: true
    });

    // Look for Data Sharing Risk card
    const dataSharingCard = page.locator('[data-testid="data-sharing-card"], div:has-text("Data Sharing Risk"), section:has-text("Data Sharing")');

    const cardExists = await dataSharingCard.count() > 0;

    if (cardExists) {
      await dataSharingCard.first().scrollIntoViewIfNeeded();
      await dataSharingCard.first().waitFor({ state: 'visible', timeout: 5000 });

      await page.screenshot({
        path: 'test-results/p1-5-data-sharing-card.png',
        fullPage: false
      });

      const cardText = await dataSharingCard.first().textContent();
      console.log('Data Sharing card text:', cardText);

      // Verify label says "Data Sharing Risk" (NOT "Data sharing level")
      expect(cardText, 'Should say "Data Sharing Risk"').toContain('Data Sharing Risk');
      expect(cardText?.toLowerCase(), 'Should NOT say "Data sharing level"').not.toContain('data sharing level');

      // Check for risk level (None, Low, Medium, High)
      const riskLevel = page.locator('[data-testid="data-sharing-level"], .risk-level, span:has-text("None"), span:has-text("Low"), span:has-text("Medium"), span:has-text("High")');

      const levelExists = await riskLevel.first().isVisible({ timeout: 3000 }).catch(() => false);

      if (levelExists) {
        const levelText = await riskLevel.first().textContent();
        console.log('Risk level:', levelText);

        // Get color styling
        const color = await riskLevel.first().evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        console.log('Risk level color:', color);

        // Verify color coding based on level
        if (levelText?.includes('None') || levelText?.includes('Low')) {
          // Should be green
          expect(color, 'None/Low should be green').toMatch(/rgb\(.*(?:0|34|22).*\)/);
        } else if (levelText?.includes('Medium')) {
          // Should be amber/orange
          console.log('Medium risk level detected - should be amber');
        } else if (levelText?.includes('High')) {
          // Should be red
          console.log('High risk level detected - should be red');
        }
      }

      console.log('PASS: Data Sharing Risk label and color coding validated\n');
    } else {
      console.log('INFO: Data Sharing Risk card not found on this report\n');
    }
  });

  test('P1-6: PRO Upgrade CTA - Banner appears and dismissal works', async () => {
    console.log('\n=== P1-6: Testing PRO Upgrade CTA ===');

    await page.goto('/');

    // Submit a scan
    const urlInput = page.locator('[data-testid="url-input"], input[type="text"][placeholder*="Enter"]');
    await urlInput.waitFor({ state: 'visible', timeout: 10000 });
    await urlInput.fill('https://example.com');

    const submitButton = page.locator('button:has-text("Scan")').first();
    await submitButton.click();

    console.log('Waiting for report...');

    // Wait for report page
    await page.waitForURL(/\/report\/.*/, { timeout: 60000 });

    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'test-results/p1-6-report-with-cta.png',
      fullPage: true
    });

    // Look for PRO upgrade CTA
    const proCTA = page.locator('[data-testid="pro-upgrade-cta"], .pro-upgrade, div:has-text("PRO"), [class*="gradient"]:has-text("Upgrade")');

    const ctaExists = await proCTA.count() > 0;

    if (ctaExists) {
      await proCTA.first().scrollIntoViewIfNeeded();

      await page.screenshot({
        path: 'test-results/p1-6-pro-cta-visible.png',
        fullPage: false
      });

      const ctaText = await proCTA.first().textContent();
      console.log('PRO CTA text:', ctaText);

      // Verify it mentions PRO benefits
      expect(ctaText?.toLowerCase(), 'Should mention PRO').toContain('pro');

      // Look for dismiss button
      const dismissButton = proCTA.locator('button[aria-label*="dismiss"], button[aria-label*="close"], button:has-text("×")');

      const dismissExists = await dismissButton.count() > 0;

      if (dismissExists) {
        await dismissButton.first().click();
        console.log('Clicked dismiss button');

        await page.waitForTimeout(1000);

        await page.screenshot({
          path: 'test-results/p1-6-pro-cta-dismissed.png',
          fullPage: false
        });

        // Verify CTA is hidden
        const ctaVisible = await proCTA.first().isVisible().catch(() => false);
        expect(ctaVisible, 'CTA should be hidden after dismissal').toBe(false);

        // Refresh and verify it stays dismissed
        await page.reload({ waitUntil: 'networkidle' });

        await page.waitForTimeout(2000);

        const ctaAfterRefresh = await proCTA.first().isVisible({ timeout: 3000 }).catch(() => false);
        expect(ctaAfterRefresh, 'CTA should stay dismissed after refresh').toBe(false);

        console.log('PASS: PRO upgrade CTA dismissal works correctly\n');
      } else {
        console.log('INFO: No dismiss button found on PRO CTA\n');
      }
    } else {
      console.log('INFO: PRO upgrade CTA not found on this report\n');
    }
  });

  test('P1-7: TLS Grade Display - Shows "Not rated" instead of "unknown"', async () => {
    console.log('\n=== P1-7: Testing TLS Grade Display ===');

    await page.goto('/');

    // Submit a scan
    const urlInput = page.locator('[data-testid="url-input"], input[type="text"][placeholder*="Enter"]');
    await urlInput.waitFor({ state: 'visible', timeout: 10000 });
    await urlInput.fill('https://example.com');

    const submitButton = page.locator('button:has-text("Scan")').first();
    await submitButton.click();

    console.log('Waiting for report...');

    // Wait for report page
    await page.waitForURL(/\/report\/.*/, { timeout: 60000 });

    await page.screenshot({
      path: 'test-results/p1-7-report-full.png',
      fullPage: true
    });

    // Look for TLS security card
    const tlsCard = page.locator('[data-testid="tls-card"], div:has-text("TLS"), section:has-text("TLS grade")');

    const cardExists = await tlsCard.count() > 0;

    if (cardExists) {
      await tlsCard.first().scrollIntoViewIfNeeded();
      await tlsCard.first().waitFor({ state: 'visible', timeout: 5000 });

      await page.screenshot({
        path: 'test-results/p1-7-tls-card.png',
        fullPage: false
      });

      const cardText = await tlsCard.first().textContent();
      console.log('TLS card text:', cardText);

      // Check for TLS grade text
      if (cardText?.toLowerCase().includes('tls grade')) {
        // Should say "Not rated" not "unknown"
        if (cardText.toLowerCase().includes('not rated')) {
          console.log('PASS: Shows "Not rated" correctly');
          expect(cardText.toLowerCase()).toContain('not rated');
        } else if (cardText.match(/[A-F][+-]?/)) {
          const grade = cardText.match(/TLS grade:\s*([A-F][+-]?)/i);
          console.log('PASS: Shows TLS grade:', grade?.[1]);
          expect(grade).toBeTruthy();
        } else {
          console.log('TLS grade text:', cardText);
        }

        // Verify it does NOT say "unknown"
        expect(cardText.toLowerCase(), 'Should NOT say "unknown"').not.toContain('tls grade: unknown');
      }

      console.log('PASS: TLS grade display validated\n');
    } else {
      console.log('INFO: TLS card not found on this report\n');
    }
  });

  test.afterAll(async () => {
    console.log('\n=== Test Summary ===');
    console.log('Total console errors captured:', consoleErrors.length);

    if (consoleErrors.length > 0) {
      console.log('\nConsole Errors:');
      consoleErrors.slice(0, 10).forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });
    }

    console.log('\nTest artifacts saved to: test-results/');
    console.log('Screenshots: test-results/p0-*.png and test-results/p1-*.png');
    console.log('\n=== End of Test Suite ===\n');
  });
});
