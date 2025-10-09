/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { ScanPage } from '../pages/ScanPage';
import { ReportPage } from '../pages/ReportPage';
import { TEST_URLS, measurePerformance, PERFORMANCE_THRESHOLDS } from '../utils/test-helpers';

test.describe('Core Privacy Scanning Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Set up error tracking
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });

    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });
  });

  test('Complete scanning journey with fixture data (fast)', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    // Step 1: Load home page
    const loadTime = await homePage.goto();
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD);

    // Step 2: Start scan with fixture URL
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);

    // Step 3: Monitor scan progress
    await scanPage.verifyProgressIndicators();
    const { state, duration } = await scanPage.waitForScanCompletion();

    expect(state).toBe('completed');
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SCAN_COMPLETION);

    // Step 4: Verify automatic redirect to report
    await scanPage.waitForReportRedirect();

    // Step 5: Verify report content
    await reportPage.waitForReportLoad();
    const score = await reportPage.getPrivacyScore();
    expect(score.score).toBeGreaterThan(70); // Fixture safe domain should have high score

    const evidence = await reportPage.getEvidenceSummary();
    expect(evidence.length).toBeGreaterThan(0);
  });

  test('Complete scanning journey with real domain', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for real domain scan

    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    // Step 1: Load home page
    await homePage.goto();

    // Step 2: Start scan with real domain
    await homePage.startScan(TEST_URLS.VALID_HTTPS);

    // Step 3: Wait for scan completion (longer timeout for real domains)
    const { state, duration } = await scanPage.waitForScanCompletion(60000);
    expect(state).toBe('completed');

    console.log(`Real domain scan completed in ${duration}ms`);

    // Step 4: Verify report content
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    const score = await reportPage.getPrivacyScore();
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);

    const scanInfo = await reportPage.getScanInfo();
    expect(scanInfo.domain).toBeTruthy();
    expect(scanInfo.timestamp).toBeTruthy();
  });

  test('HTTP to HTTPS URL handling', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();

    // Test HTTP URL input
    await homePage.startScan(TEST_URLS.VALID_HTTP);

    // Should still proceed with scan (backend handles HTTP->HTTPS)
    const { state } = await scanPage.waitForScanCompletion();
    expect(state).toBe('completed');
  });

  test('URL input validation and edge cases', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // Test various URL formats
    const testCases = [
      { url: 'example.com', shouldWork: true, description: 'Domain without protocol' },
      { url: 'https://example.com', shouldWork: true, description: 'Full HTTPS URL' },
      { url: 'http://example.com', shouldWork: true, description: 'HTTP URL' },
      { url: 'https://subdomain.example.com', shouldWork: true, description: 'Subdomain' },
      { url: 'https://example.com/path', shouldWork: true, description: 'URL with path' },
      { url: 'https://example.com:8080', shouldWork: true, description: 'URL with port' },
    ];

    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.description}`);

      await page.fill('input[aria-label="Scan input"]', testCase.url);

      if (testCase.shouldWork) {
        // Should be able to start scan
        await expect(page.locator('button:has-text("Scan Now")')).toBeEnabled();
      }
    }
  });

  test('Scan deduplication functionality', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();

    // Start first scan
    const scanUrl = await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    const { state: firstState } = await scanPage.waitForScanCompletion();
    expect(firstState).toBe('completed');

    // Get the report URL for comparison
    await scanPage.waitForReportRedirect();
    const firstReportUrl = page.url();

    // Start second scan with same URL
    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);

    // Should either redirect to existing report or complete very quickly
    const startTime = performance.now();
    await page.waitForURL(/\/r\/[\w-]+/, { timeout: 10000 });
    const duration = performance.now() - startTime;

    // Deduplication should be fast
    expect(duration).toBeLessThan(5000);

    // Should show same or equivalent report
    const secondReportUrl = page.url();
    // URLs might be different but both should be valid report pages
    expect(secondReportUrl).toMatch(/\/r\/[\w-]+/);
  });

  test('Real-time scan status updates', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_MEDIUM_RISK);

    // Monitor real-time updates
    await scanPage.verifyRealtimeUpdates();
  });

  test('Browser navigation during scan', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);

    // Test browser navigation during scan
    await scanPage.testBrowserNavigation();

    // Test rapid navigation
    await scanPage.testRapidNavigation();
  });

  test('Multiple scan tabs handling', async ({ context }) => {
    // Test opening multiple scans in different tabs
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    const homePage1 = new HomePage(page1);
    const homePage2 = new HomePage(page2);
    const scanPage1 = new ScanPage(page1);
    const scanPage2 = new ScanPage(page2);

    // Start scans in both tabs
    await homePage1.goto();
    await homePage1.startScan(TEST_URLS.FIXTURE_SAFE);

    await homePage2.goto();
    await homePage2.startScan(TEST_URLS.FIXTURE_MEDIUM_RISK);

    // Both scans should complete independently
    const [result1, result2] = await Promise.all([
      scanPage1.waitForScanCompletion(),
      scanPage2.waitForScanCompletion(),
    ]);

    expect(result1.state).toBe('completed');
    expect(result2.state).toBe('completed');

    await page1.close();
    await page2.close();
  });

  test('Scan URL sharing and direct access', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();
    const scanUrl = await homePage.startScan(TEST_URLS.FIXTURE_SAFE);

    // Complete the scan
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();

    const reportUrl = page.url();

    // Test direct access to scan URL
    await page.goto(scanUrl);
    // Should redirect to report if scan is complete
    await page.waitForURL(/\/r\/[\w-]+/);

    // Should be the same report
    expect(page.url()).toBe(reportUrl);
  });

  test('Concurrent scan handling', async ({ context }) => {
    // Test system behavior under concurrent load
    const numberOfConcurrentScans = 3;
    const pages = [];
    const homePages = [];
    const scanPages = [];

    // Create multiple pages for concurrent testing
    for (let i = 0; i < numberOfConcurrentScans; i++) {
      const page = await context.newPage();
      pages.push(page);
      homePages.push(new HomePage(page));
      scanPages.push(new ScanPage(page));
    }

    // Start all scans concurrently
    const scanPromises = homePages.map(async (homePage, index) => {
      await homePage.goto();
      const testUrl = index === 0 ? TEST_URLS.FIXTURE_SAFE :
                      index === 1 ? TEST_URLS.FIXTURE_MEDIUM_RISK :
                      TEST_URLS.FIXTURE_HIGH_RISK;
      return homePage.startScan(testUrl);
    });

    await Promise.all(scanPromises);

    // Wait for all scans to complete
    const completionPromises = scanPages.map(scanPage =>
      scanPage.waitForScanCompletion(30000)
    );

    const results = await Promise.all(completionPromises);

    // All scans should complete successfully
    results.forEach(result => {
      expect(result.state).toBe('completed');
    });

    // Clean up
    await Promise.all(pages.map(page => page.close()));
  });

  test('Scan progress percentage accuracy', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);

    // Monitor progress percentage changes
    const progressHistory: number[] = [];
    let lastProgress = 0;

    // Monitor for up to 30 seconds
    for (let i = 0; i < 30; i++) {
      const currentProgress = await scanPage.getProgressPercentage();
      progressHistory.push(currentProgress);

      // Progress should never decrease
      expect(currentProgress).toBeGreaterThanOrEqual(lastProgress);
      lastProgress = currentProgress;

      const status = await scanPage.getScanStatus();
      if (status === 'completed' || status === 'failed') {
        break;
      }

      await page.waitForTimeout(1000);
    }

    // Should have recorded some progress
    expect(progressHistory.length).toBeGreaterThan(0);

    // Final progress should be 100% for completed scans
    const finalStatus = await scanPage.getScanStatus();
    if (finalStatus === 'completed') {
      const finalProgress = await scanPage.getProgressPercentage();
      expect(finalProgress).toBe(100);
    }
  });
});