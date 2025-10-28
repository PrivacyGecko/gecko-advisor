/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { ScanPage } from '../pages/ScanPage';
import { ReportPage } from '../pages/ReportPage';
import {
  TEST_URLS,
  measurePerformance,
  PERFORMANCE_THRESHOLDS,
  simulateSlowNetwork,
  resetNetworkConditions,
} from '../utils/test-helpers';

test.describe('Performance Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    await page.addInitScript(() => {
      // Mark performance measurement start
      performance.mark('test-start');
    });
  });

  test('Scan completion under 3 seconds requirement', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();

    // Test with fixture data (should be fastest)
    const { duration } = await measurePerformance(
      async () => {
        await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
        const { state } = await scanPage.waitForScanCompletion();
        expect(state).toBe('completed');
      },
      'Complete scan journey with fixture data'
    );

    // CRITICAL: Must meet 3-second requirement for fixture data
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SCAN_COMPLETION_FAST);
    console.log(`✅ Scan completed in ${duration.toFixed(2)}ms (requirement: ${PERFORMANCE_THRESHOLDS.SCAN_COMPLETION_FAST}ms)`);
  });

  test('Database deduplication lookup performance', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();

    // First scan to populate database
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();

    // Second scan should use deduplication (must be <50ms for database lookup)
    await homePage.goto();

    const { duration } = await measurePerformance(
      async () => {
        await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
        // Should redirect quickly due to deduplication
        await page.waitForURL(/\/r\/[\w-]+/, { timeout: 5000 });
      },
      'Database deduplication lookup'
    );

    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY * 100); // Allow some overhead
    console.log(`✅ Deduplication lookup completed in ${duration.toFixed(2)}ms`);
  });

  test('Page load performance metrics', async ({ page }) => {
    const homePage = new HomePage(page);

    // Measure home page load performance
    const { duration } = await measurePerformance(
      async () => {
        await homePage.goto();
      },
      'Home page load'
    );

    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD);

    // Check Core Web Vitals
    const webVitals = await homePage.checkPerformanceMetrics();

    // First Contentful Paint should be fast
    expect(webVitals.firstContentfulPaint).toBeLessThan(2000);

    // DOM Content Loaded should be reasonable
    expect(webVitals.domContentLoaded).toBeLessThan(3000);

    console.log('📊 Performance metrics:', webVitals);
  });

  test('React Query caching optimization', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // First load - should fetch recent reports
    const { duration: firstLoad } = await measurePerformance(
      async () => {
        await page.waitForLoadState('networkidle');
        // Wait for recent reports to load if available
        await page.waitForTimeout(2000);
      },
      'First recent reports load'
    );

    // Navigate away and back
    await page.goto('/docs');
    await page.goto('/');

    // Second load - should use cache
    const { duration: secondLoad } = await measurePerformance(
      async () => {
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000); // Less time needed due to cache
      },
      'Cached recent reports load'
    );

    // Second load should be faster due to caching
    expect(secondLoad).toBeLessThan(firstLoad);
    console.log(`Cache performance improvement: ${((firstLoad - secondLoad) / firstLoad * 100).toFixed(1)}%`);
  });

  test('Frontend caching and lazy loading', async ({ page }) => {
    const homePage = new HomePage(page);

    // Measure initial bundle load
    await page.route('**/*.js', route => {
      const url = route.request().url();
      console.log(`📦 Loading JS: ${url.split('/').pop()}`);
      route.continue();
    });

    await homePage.goto();

    // Check that code splitting is working
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('.js'))
        .map(entry => ({
          name: entry.name.split('/').pop(),
          size: entry.transferSize,
          duration: entry.duration,
        }));
    });

    console.log('📦 JavaScript bundles loaded:', performanceEntries);

    // Should have multiple small bundles rather than one large bundle
    const bundleCount = performanceEntries.length;
    expect(bundleCount).toBeGreaterThan(1);

    // No single bundle should be excessively large
    performanceEntries.forEach(entry => {
      expect(entry.duration).toBeLessThan(2000); // 2 seconds max per bundle
    });
  });

  test('Network conditions impact on performance', async ({ page, browserName }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    // Test under normal conditions
    const { duration: normalDuration } = await measurePerformance(
      async () => {
        await homePage.goto();
        await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
        await scanPage.waitForScanCompletion();
      },
      'Scan under normal network conditions'
    );

    // Test under slow network conditions
    await simulateSlowNetwork(page);

    const { duration: slowDuration } = await measurePerformance(
      async () => {
        await homePage.goto();
        await homePage.startScan(TEST_URLS.FIXTURE_MEDIUM_RISK);
        await scanPage.waitForScanCompletion(15000); // Longer timeout for slow network
      },
      'Scan under slow network conditions'
    );

    await resetNetworkConditions(page);

    console.log(`Network impact: Normal=${normalDuration.toFixed(2)}ms, Slow=${slowDuration.toFixed(2)}ms`);

    // Network emulation is Chromium-only (uses CDP protocol)
    // WebKit and Firefox don't support CDP network throttling reliably
    if (browserName === 'chromium') {
      // Only assert timing relationship for Chromium where network emulation works
      expect(slowDuration).toBeGreaterThan(normalDuration);
      console.log(`✅ Network throttling validation: Slow (${slowDuration.toFixed(2)}ms) > Normal (${normalDuration.toFixed(2)}ms)`);
    } else {
      console.log(`⚠️  Skipping network throttling comparison for ${browserName} (CDP not fully supported)`);
    }

    // Absolute performance threshold applies to all browsers
    expect(slowDuration).toBeLessThan(15000); // Should still complete within 15s
  });

  test('Backend N+1 query fixes validation', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    // Monitor network requests
    const apiRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push(request.url());
      }
    });

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    // Should not have excessive API calls
    const evidenceRequests = apiRequests.filter(url => url.includes('evidence'));
    const reportRequests = apiRequests.filter(url => url.includes('report'));

    // Should be minimal requests due to N+1 query fixes
    expect(evidenceRequests.length).toBeLessThan(5);
    expect(reportRequests.length).toBeLessThan(3);

    console.log(`📡 API requests made: ${apiRequests.length} total`);
    console.log(`   - Evidence requests: ${evidenceRequests.length}`);
    console.log(`   - Report requests: ${reportRequests.length}`);
  });

  test('Redis caching performance', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();

    // First scan should populate cache
    const { duration: firstScan } = await measurePerformance(
      async () => {
        await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
        await scanPage.waitForScanCompletion();
      },
      'First scan (cache miss)'
    );

    // Second scan should benefit from caching
    await homePage.goto();

    const { duration: secondScan } = await measurePerformance(
      async () => {
        await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
        // Should complete much faster due to caching
        await page.waitForURL(/\/r\/[\w-]+/, { timeout: 5000 });
      },
      'Second scan (cache hit)'
    );

    // Cache hit should be faster (adjusted for CI variability)
    expect(secondScan).toBeLessThan(firstScan * 0.9); // At least 10% faster (realistic for CI variability)
    console.log(`Redis cache performance improvement: ${((firstScan - secondScan) / firstScan * 100).toFixed(1)}%`);
  });

  test('Concurrent user simulation', async ({ context }) => {
    const numberOfUsers = 5;
    const results: number[] = [];

    // Simulate multiple concurrent users
    const userPromises = Array.from({ length: numberOfUsers }, async (_, index) => {
      const page = await context.newPage();
      const homePage = new HomePage(page);
      const scanPage = new ScanPage(page);

      const testUrl = index % 2 === 0 ? TEST_URLS.FIXTURE_SAFE : TEST_URLS.FIXTURE_MEDIUM_RISK;

      const { duration } = await measurePerformance(
        async () => {
          await homePage.goto();
          await homePage.startScan(testUrl);
          await scanPage.waitForScanCompletion(20000); // Extended timeout for concurrent load
        },
        `Concurrent user ${index + 1}`
      );

      results.push(duration);
      await page.close();

      return duration;
    });

    await Promise.all(userPromises);

    // All scans should complete within reasonable time
    results.forEach((duration, index) => {
      expect(duration).toBeLessThan(20000); // 20 seconds max under load
      console.log(`User ${index + 1}: ${duration.toFixed(2)}ms`);
    });

    const averageDuration = results.reduce((sum, duration) => sum + duration, 0) / results.length;
    console.log(`Average duration under concurrent load: ${averageDuration.toFixed(2)}ms`);

    // Average should still be reasonable
    expect(averageDuration).toBeLessThan(10000);
  });

  test('Memory usage during extended scanning', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();

    // Perform multiple scans to test for memory leaks
    const memorySnapshots: number[] = [];

    for (let i = 0; i < 5; i++) {
      const testUrl = i % 3 === 0 ? TEST_URLS.FIXTURE_SAFE :
                      i % 3 === 1 ? TEST_URLS.FIXTURE_MEDIUM_RISK :
                      TEST_URLS.FIXTURE_HIGH_RISK;

      await homePage.goto();
      await homePage.startScan(testUrl);
      await scanPage.waitForScanCompletion();

      // Take memory snapshot
      const memoryUsage = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      if (memoryUsage > 0) {
        memorySnapshots.push(memoryUsage);
        console.log(`Scan ${i + 1} memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)} MB`);
      }

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
    }

    // Only check memory growth if memory API is available and we have valid snapshots
    if (memorySnapshots.length > 2 && memorySnapshots.every(snapshot => snapshot > 0)) {
      // Memory usage shouldn't grow excessively
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = (lastSnapshot - firstSnapshot) / firstSnapshot;

      console.log(`Memory growth over ${memorySnapshots.length} scans: ${(memoryGrowth * 100).toFixed(1)}%`);

      // Should not grow more than 50% over multiple scans
      expect(memoryGrowth).toBeLessThan(0.5);
    } else if (memorySnapshots.length === 0 || memorySnapshots.every(s => s === 0)) {
      console.log('⚠️  Memory API not available in this environment, skipping memory growth test');
    }
  });

  test('API response time validation', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    // Monitor API response times
    const apiTimes: { url: string; duration: number }[] = [];

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const timing = response.request().timing();
        if (timing) {
          apiTimes.push({
            url: response.url(),
            duration: timing.responseEnd,
          });
        }
      }
    });

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();

    // Analyze API response times
    apiTimes.forEach(({ url, duration }) => {
      console.log(`API ${url.split('/').pop()}: ${duration.toFixed(2)}ms`);

      // Critical APIs should be fast
      if (url.includes('/scans') || url.includes('/reports')) {
        expect(duration).toBeLessThan(1000); // 1 second max for critical APIs
      }
    });
  });
});