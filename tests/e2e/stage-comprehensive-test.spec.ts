// SPDX-License-Identifier: MIT
/**
 * Comprehensive E2E Test Suite for Gecko Advisor Stage Environment
 * Test URL: https://stage.geckoadvisor.com
 *
 * This test suite validates all critical user journeys and functionality
 * after deployment to the stage environment.
 */

import { test, expect, type Page } from '@playwright/test';

const STAGE_URL = 'https://stage.geckoadvisor.com';
const TEST_TIMEOUT = 120000; // 2 minutes per test

// Test results storage
interface TestResult {
  journey: string;
  score: number;
  issues: string[];
  evidence: string[];
  status: 'PASS' | 'FAIL';
}

const testResults: TestResult[] = [];

// Helper function to add test result
function recordResult(journey: string, score: number, issues: string[], evidence: string[], status: 'PASS' | 'FAIL') {
  testResults.push({ journey, score, issues, evidence, status });
}

test.describe('Journey 1: First-Time User Scan Journey', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should complete full scan flow from landing to results', async ({ page }) => {
    const issues: string[] = [];
    const evidence: string[] = [];
    let score = 100;

    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Step 1: Land on homepage
    await test.step('Navigate to homepage', async () => {
      const response = await page.goto(STAGE_URL);
      expect(response?.status()).toBe(200);
      evidence.push('Homepage loaded with 200 status');

      await expect(page).toHaveTitle(/Gecko Advisor/);
      evidence.push('Page title contains "Gecko Advisor"');
    });

    // Step 2: Verify value proposition
    await test.step('Verify rule-based messaging', async () => {
      const heroText = await page.textContent('text=rule-based scanner');
      if (heroText) {
        evidence.push('Rule-based scanner messaging present');
      } else {
        issues.push('Rule-based scanner messaging not found');
        score -= 10;
      }
    });

    // Step 3: Submit URL scan
    await test.step('Submit example.com scan', async () => {
      const urlInput = page.locator('input[placeholder*="example.com"]');
      await expect(urlInput).toBeVisible();

      // Clear and type new URL
      await urlInput.clear();
      await urlInput.fill('https://example.com');
      evidence.push('Entered URL: https://example.com');

      const scanButton = page.locator('button:has-text("Scan Now")');
      await expect(scanButton).toBeEnabled();

      await scanButton.click();
      evidence.push('Clicked Scan Now button');
    });

    // Step 4: Monitor scan progress
    await test.step('Wait for scan completion', async () => {
      // Wait for either results page or progress indicator
      try {
        // Wait for navigation to report page (could be existing or new)
        await page.waitForURL(/\/r\//, { timeout: 30000 });
        evidence.push('Navigated to report page');
      } catch (e) {
        issues.push(`Scan did not complete within 30 seconds: ${e}`);
        score -= 30;
      }
    });

    // Step 5: Verify results display
    await test.step('Verify results page elements', async () => {
      // Check for score dial
      const scoreDial = page.locator('text=/^\\d+$/').first();
      if (await scoreDial.isVisible()) {
        const scoreValue = await scoreDial.textContent();
        evidence.push(`Score displayed: ${scoreValue}`);
      } else {
        issues.push('Score dial not displayed');
        score -= 20;
      }

      // Check for evidence categories
      const evidenceSection = page.locator('text=/items collapsed|items visible/i').first();
      if (await evidenceSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        evidence.push('Evidence categories section visible');
      } else {
        issues.push('Evidence categories not visible');
        score -= 10;
      }
    });

    // Step 6: Test evidence expansion
    await test.step('Expand evidence categories', async () => {
      const expandButton = page.locator('button:has-text("Expand all")');
      if (await expandButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expandButton.click();
        evidence.push('Clicked Expand all button');
        await page.waitForTimeout(1000);
      } else {
        // Try clicking category directly
        const categoryButton = page.locator('button:has-text("Undefined")').first();
        if (await categoryButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await categoryButton.click();
          evidence.push('Expanded first category');
        }
      }
    });

    // Step 7: Export JSON
    await test.step('Export report as JSON', async () => {
      const exportButton = page.locator('button:has-text("Export JSON")');
      if (await exportButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          exportButton.click()
        ]);
        evidence.push(`JSON export successful: ${download.suggestedFilename()}`);
      } else {
        issues.push('Export JSON button not found');
        score -= 5;
      }
    });

    // Check for console errors (CSP violations)
    if (consoleErrors.length > 0) {
      const cspErrors = consoleErrors.filter(e => e.includes('Content Security Policy'));
      if (cspErrors.length > 0) {
        issues.push(`${cspErrors.length} CSP violations detected`);
        score -= 20; // Major penalty for CSP issues
      }
    }

    const status: 'PASS' | 'FAIL' = score >= 70 ? 'PASS' : 'FAIL';
    recordResult('Journey 1: First-Time User Scan', score, issues, evidence, status);

    expect(status).toBe('PASS');
    expect(score).toBeGreaterThanOrEqual(70);
  });
});

test.describe('Journey 2: Logo & Branding Visibility', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should display logo with correct sizing and optimization', async ({ page }) => {
    const issues: string[] = [];
    const evidence: string[] = [];
    let score = 100;

    await page.goto(STAGE_URL);

    await test.step('Check header logo visibility', async () => {
      const headerLogo = page.locator('img[alt*="Gecko Advisor"]').first();
      await expect(headerLogo).toBeVisible();

      const boundingBox = await headerLogo.boundingBox();
      if (boundingBox) {
        evidence.push(`Header logo size: ${boundingBox.width}x${boundingBox.height}px`);
        // Check if height is approximately 56px (h-14 = 3.5rem = 56px)
        if (boundingBox.height < 50 || boundingBox.height > 70) {
          issues.push(`Logo height ${boundingBox.height}px not in expected range (50-70px for h-14)`);
          score -= 15;
        }
      }
    });

    await test.step('Verify logo loads quickly', async () => {
      const logoLoadTime = await page.evaluate(() => {
        const perfEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const logoEntry = perfEntries.find(e => e.name.includes('logo') || e.name.includes('gecko'));
        return logoEntry ? logoEntry.duration : null;
      });

      if (logoLoadTime) {
        evidence.push(`Logo load time: ${logoLoadTime.toFixed(2)}ms`);
        if (logoLoadTime > 500) {
          issues.push(`Logo load time ${logoLoadTime}ms exceeds 500ms threshold`);
          score -= 10;
        }
      }
    });

    await test.step('Test mobile header logo', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();

      const mobileLogo = page.locator('img[alt*="Gecko Advisor"]').first();
      await expect(mobileLogo).toBeVisible();
      evidence.push('Logo visible on mobile viewport');
    });

    const status: 'PASS' | 'FAIL' = score >= 70 ? 'PASS' : 'FAIL';
    recordResult('Journey 2: Logo & Branding', score, issues, evidence, status);

    expect(status).toBe('PASS');
  });
});

test.describe('Journey 3: Attribution Accessibility', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should display all required attributions and licenses', async ({ page }) => {
    const issues: string[] = [];
    const evidence: string[] = [];
    let score = 100;

    await page.goto(`${STAGE_URL}/about`);

    await test.step('Verify Inter Font attribution', async () => {
      const interAttribution = page.locator('text=Inter Font');
      await expect(interAttribution).toBeVisible();
      evidence.push('Inter Font attribution visible');

      const oflLink = page.locator('a[href="/fonts/OFL.txt"]');
      await expect(oflLink).toBeVisible();
      evidence.push('OFL license link present');

      // Click and verify link works
      const [oflPage] = await Promise.all([
        page.context().waitForEvent('page'),
        oflLink.click({ modifiers: ['Meta'] }) // Cmd+click to open in new tab
      ]);

      if (oflPage) {
        await oflPage.waitForLoadState();
        const url = oflPage.url();
        if (url.includes('/fonts/OFL.txt')) {
          evidence.push('OFL.txt opens successfully');
        } else {
          issues.push('OFL.txt link does not navigate correctly');
          score -= 20;
        }
        await oflPage.close();
      }
    });

    await test.step('Verify data source attributions', async () => {
      const requiredSources = ['EasyPrivacy', 'WhoTracks.me', 'Public Suffix List'];

      for (const source of requiredSources) {
        const sourceElement = page.locator(`text=${source}`);
        if (await sourceElement.isVisible()) {
          evidence.push(`${source} attribution present`);
        } else {
          issues.push(`${source} attribution missing`);
          score -= 15;
        }
      }
    });

    const status: 'PASS' | 'FAIL' = score >= 70 ? 'PASS' : 'FAIL';
    recordResult('Journey 3: Attribution Accessibility', score, issues, evidence, status);

    expect(status).toBe('PASS');
  });
});

test.describe('Journey 4: Console & Browser Errors', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should have zero CSP violations and minimal console errors', async ({ page }) => {
    const issues: string[] = [];
    const evidence: string[] = [];
    let score = 100;

    const consoleMessages: { type: string; text: string }[] = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    await page.goto(STAGE_URL);
    await page.waitForLoadState('networkidle');

    await test.step('Check for CSP violations', async () => {
      const cspErrors = consoleMessages.filter(m =>
        m.type === 'error' && m.text.includes('Content Security Policy')
      );

      if (cspErrors.length > 0) {
        issues.push(`CRITICAL: ${cspErrors.length} CSP violations detected`);
        evidence.push(`CSP violations: ${cspErrors.map(e => e.text.substring(0, 100)).join('; ')}`);
        score -= 50; // Major penalty
      } else {
        evidence.push('No CSP violations detected');
      }
    });

    await test.step('Check for JavaScript errors', async () => {
      const jsErrors = consoleMessages.filter(m =>
        m.type === 'error' && !m.text.includes('Content Security Policy')
      );

      if (jsErrors.length > 0) {
        issues.push(`${jsErrors.length} JavaScript errors detected`);
        evidence.push(`JS errors: ${jsErrors.map(e => e.text.substring(0, 80)).join('; ')}`);
        score -= Math.min(30, jsErrors.length * 10);
      } else {
        evidence.push('No JavaScript errors');
      }
    });

    await test.step('Check network requests', async () => {
      const failedRequests = await page.evaluate(() => {
        const perfEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        return perfEntries
          .filter(e => e.responseStatus === 404 || e.responseStatus === 500)
          .map(e => ({ url: e.name, status: e.responseStatus }));
      });

      if (failedRequests.length > 0) {
        issues.push(`${failedRequests.length} failed network requests`);
        evidence.push(`Failed requests: ${JSON.stringify(failedRequests)}`);
        score -= Math.min(20, failedRequests.length * 5);
      } else {
        evidence.push('All network requests successful');
      }
    });

    const status: 'PASS' | 'FAIL' = score >= 70 ? 'PASS' : 'FAIL';
    recordResult('Journey 4: Console & Browser Errors', score, issues, evidence, status);

    expect(status).toBe('PASS');
  });
});

test.describe('Journey 5: Recent Reports Section', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should display and navigate recent reports', async ({ page }) => {
    const issues: string[] = [];
    const evidence: string[] = [];
    let score = 100;

    await page.goto(STAGE_URL);

    await test.step('Verify recent reports display', async () => {
      const recentReportsHeading = page.locator('h2:has-text("Recent Reports")');

      if (await recentReportsHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
        evidence.push('Recent Reports section visible');

        const reportLinks = page.locator('a:has-text("View")');
        const count = await reportLinks.count();
        evidence.push(`${count} recent reports displayed`);

        if (count === 0) {
          issues.push('No recent reports found');
          score -= 20;
        }
      } else {
        issues.push('Recent Reports section not found');
        score -= 30;
      }
    });

    await test.step('Navigate to recent report', async () => {
      const firstViewLink = page.locator('a:has-text("View")').first();

      if (await firstViewLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstViewLink.click();
        await page.waitForURL(/\/r\//);
        evidence.push('Successfully navigated to recent report');

        // Verify report loaded
        const scoreElement = page.locator('text=/^\\d+$/').first();
        if (await scoreElement.isVisible({ timeout: 5000 }).catch(() => false)) {
          evidence.push('Report loaded successfully');
        } else {
          issues.push('Report did not load correctly');
          score -= 20;
        }
      } else {
        issues.push('Could not click View link');
        score -= 25;
      }
    });

    await test.step('Test back navigation', async () => {
      await page.goBack();
      await expect(page).toHaveURL(STAGE_URL);
      evidence.push('Back navigation successful');
    });

    const status: 'PASS' | 'FAIL' = score >= 70 ? 'PASS' : 'FAIL';
    recordResult('Journey 5: Recent Reports', score, issues, evidence, status);

    expect(status).toBe('PASS');
  });
});

test.describe('Journey 6: Pricing Page Journey', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should display pricing information correctly', async ({ page }) => {
    const issues: string[] = [];
    const evidence: string[] = [];
    let score = 100;

    await page.goto(`${STAGE_URL}/pricing`);

    await test.step('Verify pricing page loads', async () => {
      await expect(page).toHaveURL(/\/pricing/);
      evidence.push('Pricing page loaded');
    });

    await test.step('Check for feature comparison', async () => {
      const freeSection = page.locator('text=/FREE|Free/i');
      const proSection = page.locator('text=/PRO|Pro/i');

      const hasFree = await freeSection.isVisible({ timeout: 5000 }).catch(() => false);
      const hasPro = await proSection.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasFree && hasPro) {
        evidence.push('FREE and PRO tiers visible');
      } else {
        issues.push('Pricing tiers not properly displayed');
        score -= 25;
      }
    });

    await test.step('Verify "Coming Soon" labels', async () => {
      const comingSoonLabels = page.locator('text=/Coming Soon/i');
      const count = await comingSoonLabels.count();

      if (count > 0) {
        evidence.push(`${count} "Coming Soon" labels present`);
      } else {
        // This might be intentional, so just note it
        evidence.push('No "Coming Soon" labels found');
      }
    });

    const status: 'PASS' | 'FAIL' = score >= 70 ? 'PASS' : 'FAIL';
    recordResult('Journey 6: Pricing Page', score, issues, evidence, status);

    expect(status).toBe('PASS');
  });
});

test.describe('Journey 7: Mobile Responsiveness', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should work correctly on mobile viewport', async ({ page }) => {
    const issues: string[] = [];
    const evidence: string[] = [];
    let score = 100;

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(STAGE_URL);

    await test.step('Verify mobile navigation', async () => {
      // Look for hamburger menu or mobile navigation
      const mobileMenu = page.locator('button').filter({ hasText: /menu|☰/i }).first();

      if (await mobileMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        evidence.push('Mobile menu button visible');
        await mobileMenu.click();
        await page.waitForTimeout(500);
        evidence.push('Mobile menu opened');
      } else {
        // Check if navigation is visible directly
        const navLinks = page.locator('nav a');
        const isVisible = await navLinks.first().isVisible({ timeout: 3000 }).catch(() => false);
        if (isVisible) {
          evidence.push('Navigation links visible on mobile');
        } else {
          issues.push('Mobile navigation not found');
          score -= 20;
        }
      }
    });

    await test.step('Test scan form on mobile', async () => {
      const urlInput = page.locator('input[placeholder*="example.com"]');
      await expect(urlInput).toBeVisible();

      const inputBox = await urlInput.boundingBox();
      if (inputBox) {
        evidence.push(`Input field width: ${inputBox.width}px`);
        if (inputBox.width < 200) {
          issues.push('Input field too narrow on mobile');
          score -= 10;
        }
      }

      const scanButton = page.locator('button:has-text("Scan Now")');
      const buttonBox = await scanButton.boundingBox();
      if (buttonBox) {
        evidence.push(`Scan button size: ${buttonBox.width}x${buttonBox.height}px`);
        // Touch target should be at least 44px
        if (buttonBox.height < 44) {
          issues.push('Scan button touch target too small (< 44px)');
          score -= 15;
        }
      }
    });

    const status: 'PASS' | 'FAIL' = score >= 70 ? 'PASS' : 'FAIL';
    recordResult('Journey 7: Mobile Responsiveness', score, issues, evidence, status);

    expect(status).toBe('PASS');
  });
});

test.describe('Journey 8: Accessibility Testing', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should support keyboard navigation and screen readers', async ({ page }) => {
    const issues: string[] = [];
    const evidence: string[] = [];
    let score = 100;

    await page.goto(STAGE_URL);

    await test.step('Test keyboard navigation', async () => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          text: el?.textContent?.substring(0, 50)
        };
      });

      evidence.push(`Focused element: ${focusedElement.tag} - "${focusedElement.text}"`);
    });

    await test.step('Check for focus indicators', async () => {
      const hasFocusRing = await page.evaluate(() => {
        const style = getComputedStyle(document.activeElement!);
        return style.outline !== 'none' || style.boxShadow.includes('ring');
      });

      if (hasFocusRing) {
        evidence.push('Focus indicators present');
      } else {
        issues.push('Focus indicators may be missing');
        score -= 20;
      }
    });

    await test.step('Verify ARIA labels', async () => {
      const ariaElements = await page.locator('[aria-label]').count();
      evidence.push(`${ariaElements} elements with aria-label found`);

      if (ariaElements < 5) {
        issues.push('Few ARIA labels detected - may impact screen reader experience');
        score -= 15;
      }
    });

    await test.step('Check form labels', async () => {
      const urlInput = page.locator('input[placeholder*="example.com"]');
      const ariaLabel = await urlInput.getAttribute('aria-label');

      if (ariaLabel) {
        evidence.push(`URL input has aria-label: "${ariaLabel}"`);
      } else {
        issues.push('URL input missing aria-label');
        score -= 10;
      }
    });

    const status: 'PASS' | 'FAIL' = score >= 70 ? 'PASS' : 'FAIL';
    recordResult('Journey 8: Accessibility', score, issues, evidence, status);

    expect(status).toBe('PASS');
  });
});

test.describe('Journey 9: Performance Testing', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should meet performance benchmarks', async ({ page }) => {
    const issues: string[] = [];
    const evidence: string[] = [];
    let score = 100;

    const startTime = Date.now();
    await page.goto(STAGE_URL);
    await page.waitForLoadState('networkidle');
    const pageLoadTime = Date.now() - startTime;

    await test.step('Measure page load time', async () => {
      evidence.push(`Total page load time: ${pageLoadTime}ms`);

      if (pageLoadTime > 3000) {
        issues.push(`Page load ${pageLoadTime}ms exceeds 3s threshold`);
        score -= 30;
      }
    });

    await test.step('Measure Web Vitals', async () => {
      const metrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          ttfb: perfData.responseStart - perfData.requestStart
        };
      });

      evidence.push(`DOM Content Loaded: ${metrics.domContentLoaded.toFixed(2)}ms`);
      evidence.push(`Load Complete: ${metrics.loadComplete.toFixed(2)}ms`);
      evidence.push(`TTFB: ${metrics.ttfb.toFixed(2)}ms`);

      if (metrics.ttfb > 600) {
        issues.push('Time to First Byte exceeds 600ms');
        score -= 15;
      }
    });

    const status: 'PASS' | 'FAIL' = score >= 70 ? 'PASS' : 'FAIL';
    recordResult('Journey 9: Performance', score, issues, evidence, status);

    expect(status).toBe('PASS');
  });
});

test.describe('Journey 10: Rate Limiting Behavior', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('should handle rate limiting gracefully', async ({ page }) => {
    const issues: string[] = [];
    const evidence: string[] = [];
    let score = 100;

    await page.goto(STAGE_URL);

    await test.step('Submit multiple scans quickly', async () => {
      const urlInput = page.locator('input[placeholder*="example.com"]');
      const scanButton = page.locator('button:has-text("Scan Now")');

      // First scan
      await urlInput.clear();
      await urlInput.fill('https://example.com');
      await scanButton.click();
      await page.waitForTimeout(2000);

      // Navigate back
      await page.goto(STAGE_URL);

      // Second scan
      await urlInput.clear();
      await urlInput.fill('https://github.com');
      await scanButton.click();
      await page.waitForTimeout(2000);

      // Navigate back
      await page.goto(STAGE_URL);

      // Third scan
      await urlInput.clear();
      await urlInput.fill('https://wikipedia.org');
      await scanButton.click();
      await page.waitForTimeout(2000);

      evidence.push('Submitted 3 scans in quick succession');
    });

    await test.step('Check for rate limit messaging', async () => {
      // Try fourth scan
      await page.goto(STAGE_URL);
      const urlInput = page.locator('input[placeholder*="example.com"]');
      const scanButton = page.locator('button:has-text("Scan Now")');

      await urlInput.clear();
      await urlInput.fill('https://example.org');
      await scanButton.click();

      await page.waitForTimeout(3000);

      // Check for rate limit error
      const rateLimitMessage = page.locator('text=/rate limit|too many|limit exceeded/i');
      const hasRateLimit = await rateLimitMessage.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasRateLimit) {
        evidence.push('Rate limiting message displayed appropriately');
      } else {
        // Rate limit may not have been hit yet
        evidence.push('Rate limit not triggered (may need more requests)');
      }
    });

    const status: 'PASS' | 'FAIL' = score >= 70 ? 'PASS' : 'FAIL';
    recordResult('Journey 10: Rate Limiting', score, issues, evidence, status);

    expect(status).toBe('PASS');
  });
});

// Generate final report
test.afterAll(async () => {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE E2E TEST REPORT - GECKO ADVISOR STAGE');
  console.log('='.repeat(80));
  console.log(`Test Environment: ${STAGE_URL}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('='.repeat(80) + '\n');

  let totalScore = 0;
  let passCount = 0;
  let failCount = 0;

  testResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result.journey}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Score: ${result.score}/100`);

    if (result.issues.length > 0) {
      console.log(`   Issues (${result.issues.length}):`);
      result.issues.forEach(issue => console.log(`     - ${issue}`));
    }

    if (result.evidence.length > 0) {
      console.log(`   Evidence (${result.evidence.length}):`);
      result.evidence.slice(0, 3).forEach(ev => console.log(`     + ${ev}`));
      if (result.evidence.length > 3) {
        console.log(`     + ... and ${result.evidence.length - 3} more`);
      }
    }

    console.log('');

    totalScore += result.score;
    if (result.status === 'PASS') passCount++;
    else failCount++;
  });

  const avgScore = Math.round(totalScore / testResults.length);

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${testResults.length}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Overall E2E Score: ${avgScore}/100`);
  console.log('');

  const recommendation = avgScore >= 80 && failCount === 0 ? 'GO' :
                         avgScore >= 70 && failCount <= 2 ? 'GO (with minor issues)' :
                         'NO-GO';

  console.log(`RECOMMENDATION: ${recommendation}`);
  console.log('='.repeat(80));
});
