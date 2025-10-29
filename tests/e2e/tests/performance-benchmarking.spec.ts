/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
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
  generateTestData,
} from '../utils/test-helpers';

test.describe('Performance Benchmarking & Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    await page.addInitScript(() => {
      // Enhanced performance tracking
      (window as any).performanceMetrics = {
        navigationStart: performance.timeOrigin,
        marks: new Map(),
        measures: new Map(),
      };

      // Custom performance marking
      (window as any).markPerformance = (name: string) => {
        performance.mark(name);
        (window as any).performanceMetrics.marks.set(name, performance.now());
      };

      // Custom performance measuring
      (window as any).measurePerformance = (name: string, startMark: string, endMark?: string) => {
        const measure = performance.measure(name, startMark, endMark);
        (window as any).performanceMetrics.measures.set(name, measure.duration);
        return measure.duration;
      };
    });
  });

  test('Comprehensive performance baseline measurement', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    // Mark start of journey
    await page.evaluate(() => {
      (window as any).markPerformance('journey-start');
    });

    // Measure home page load
    const { duration: homeLoadTime } = await measurePerformance(
      async () => {
        await homePage.goto();
        await page.evaluate(() => (window as any).markPerformance('home-loaded'));
      },
      'Home page initial load'
    );

    // Measure scan initiation
    const { duration: scanInitTime } = await measurePerformance(
      async () => {
        await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
        await page.evaluate(() => (window as any).markPerformance('scan-initiated'));
      },
      'Scan initiation'
    );

    // Measure scan completion
    const { duration: scanCompleteTime } = await measurePerformance(
      async () => {
        await scanPage.waitForScanCompletion();
        await page.evaluate(() => (window as any).markPerformance('scan-completed'));
      },
      'Scan completion'
    );

    // Measure report page load
    const { duration: reportLoadTime } = await measurePerformance(
      async () => {
        await scanPage.waitForReportRedirect();
        await reportPage.waitForReportLoad();
        await page.evaluate(() => (window as any).markPerformance('report-loaded'));
      },
      'Report page load'
    );

    // Calculate total journey time
    const totalJourneyTime = await page.evaluate(() => {
      return (window as any).measurePerformance('total-journey', 'journey-start', 'report-loaded');
    });

    // Log comprehensive metrics
    console.log('=== Performance Baseline Metrics ===');
    console.log(`Home Load: ${homeLoadTime.toFixed(2)}ms`);
    console.log(`Scan Init: ${scanInitTime.toFixed(2)}ms`);
    console.log(`Scan Complete: ${scanCompleteTime.toFixed(2)}ms`);
    console.log(`Report Load: ${reportLoadTime.toFixed(2)}ms`);
    console.log(`Total Journey: ${totalJourneyTime.toFixed(2)}ms`);

    // Performance assertions
    expect(homeLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD);
    expect(scanCompleteTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SCAN_COMPLETION);
    expect(reportLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD);
    expect(totalJourneyTime).toBeLessThan(15000); // 15 seconds total journey

    // Store metrics for reporting
    await page.evaluate(metrics => {
      console.log('Performance metrics for CI:', JSON.stringify(metrics));
    }, {
      homeLoad: homeLoadTime,
      scanInit: scanInitTime,
      scanComplete: scanCompleteTime,
      reportLoad: reportLoadTime,
      totalJourney: totalJourneyTime,
    });
  });

  test('Load testing simulation', async ({ context }) => {
    const numberOfConcurrentUsers = 5;
    const testDuration = 30000; // 30 seconds
    const metrics: Array<{
      userId: number;
      startTime: number;
      endTime: number;
      duration: number;
      success: boolean;
      error?: string;
    }> = [];

    // Create concurrent user sessions
    const userPromises = Array.from({ length: numberOfConcurrentUsers }, async (_, userId) => {
      const page = await context.newPage();
      const homePage = new HomePage(page);
      const scanPage = new ScanPage(page);

      const startTime = performance.now();
      let success = false;
      let error: string | undefined;

      try {
        // Random test URLs to distribute load
        const testUrls = [
          TEST_URLS.FIXTURE_SAFE,
          TEST_URLS.FIXTURE_MEDIUM_RISK,
          TEST_URLS.FIXTURE_HIGH_RISK,
        ];
        const testUrl = testUrls[userId % testUrls.length];

        await homePage.goto();
        await homePage.startScan(testUrl);

        // Set timeout based on test duration
        const { state } = await scanPage.waitForScanCompletion(testDuration);
        success = state === 'completed';

      } catch (e) {
        error = e instanceof Error ? e.message : 'Unknown error';
        console.log(`User ${userId} encountered error: ${error}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      metrics.push({
        userId,
        startTime,
        endTime,
        duration,
        success,
        error,
      });

      await page.close();
      return { userId, success, duration };
    });

    // Wait for all concurrent users to complete
    const results = await Promise.allSettled(userPromises);

    // Analyze load test results
    const successfulUsers = metrics.filter(m => m.success).length;
    const averageDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    const maxDuration = Math.max(...metrics.map(m => m.duration));
    const minDuration = Math.min(...metrics.map(m => m.duration));

    console.log('=== Load Test Results ===');
    console.log(`Concurrent Users: ${numberOfConcurrentUsers}`);
    console.log(`Successful: ${successfulUsers}/${numberOfConcurrentUsers}`);
    console.log(`Success Rate: ${(successfulUsers / numberOfConcurrentUsers * 100).toFixed(1)}%`);
    console.log(`Average Duration: ${averageDuration.toFixed(2)}ms`);
    console.log(`Max Duration: ${maxDuration.toFixed(2)}ms`);
    console.log(`Min Duration: ${minDuration.toFixed(2)}ms`);

    // Performance under load should be reasonable
    expect(successfulUsers / numberOfConcurrentUsers).toBeGreaterThan(0.8); // 80% success rate
    expect(averageDuration).toBeLessThan(20000); // 20 seconds average under load
  });

  test('Memory usage monitoring', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    // Track memory usage throughout test
    const memorySnapshots: Array<{
      timestamp: number;
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
      action: string;
    }> = [];

    const takeMemorySnapshot = async (action: string) => {
      const memoryInfo = await page.evaluate(() => {
        const memory = (performance as any).memory;
        return memory ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        } : null;
      });

      if (memoryInfo) {
        memorySnapshots.push({
          timestamp: Date.now(),
          ...memoryInfo,
          action,
        });
      }
    };

    // Baseline memory
    await takeMemorySnapshot('initial');

    // Home page load
    await homePage.goto();
    await takeMemorySnapshot('home-loaded');

    // Multiple scans to test for memory leaks
    for (let i = 0; i < 3; i++) {
      const testUrl = i === 0 ? TEST_URLS.FIXTURE_SAFE :
                     i === 1 ? TEST_URLS.FIXTURE_MEDIUM_RISK :
                     TEST_URLS.FIXTURE_HIGH_RISK;

      await homePage.goto();
      await homePage.startScan(testUrl);
      await scanPage.waitForScanCompletion();
      await scanPage.waitForReportRedirect();
      await reportPage.waitForReportLoad();

      await takeMemorySnapshot(`scan-${i + 1}-complete`);

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      await takeMemorySnapshot(`scan-${i + 1}-gc`);
    }

    // Analyze memory usage
    console.log('=== Memory Usage Analysis ===');
    memorySnapshots.forEach(snapshot => {
      const usedMB = (snapshot.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const totalMB = (snapshot.totalJSHeapSize / 1024 / 1024).toFixed(2);
      console.log(`${snapshot.action}: ${usedMB}MB used, ${totalMB}MB total`);
    });

    // Check for memory leaks
    if (memorySnapshots.length >= 4) {
      const initialMemory = memorySnapshots[0].usedJSHeapSize;
      const finalMemory = memorySnapshots[memorySnapshots.length - 1].usedJSHeapSize;
      const memoryGrowth = (finalMemory - initialMemory) / initialMemory;

      console.log(`Memory growth: ${(memoryGrowth * 100).toFixed(1)}%`);

      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(0.5); // Less than 50% growth
    }
  });

  test('Network resource optimization', async ({ page }) => {
    const homePage = new HomePage(page);

    // Monitor network requests
    const networkRequests: Array<{
      url: string;
      resourceType: string;
      size: number;
      duration: number;
      fromCache: boolean;
    }> = [];

    page.on('response', async response => {
      const request = response.request();
      const timing = request.timing();

      if (timing) {
        networkRequests.push({
          url: response.url(),
          resourceType: request.resourceType(),
          size: (await response.body()).length || 0,
          duration: timing.responseEnd,
          fromCache: response.fromServiceWorker() || response.status() === 304,
        });
      }
    });

    // Load home page and analyze network usage
    await homePage.goto();
    await page.waitForLoadState('networkidle');

    // Analyze network performance
    const totalSize = networkRequests.reduce((sum, req) => sum + req.size, 0);
    const totalRequests = networkRequests.length;
    const cachedRequests = networkRequests.filter(req => req.fromCache).length;
    const slowRequests = networkRequests.filter(req => req.duration > 1000).length;

    console.log('=== Network Resource Analysis ===');
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Total Size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Cached Requests: ${cachedRequests} (${(cachedRequests / totalRequests * 100).toFixed(1)}%)`);
    console.log(`Slow Requests (>1s): ${slowRequests}`);

    // Analyze by resource type
    const resourceTypes = new Map<string, { count: number; size: number }>();
    networkRequests.forEach(req => {
      const existing = resourceTypes.get(req.resourceType) || { count: 0, size: 0 };
      resourceTypes.set(req.resourceType, {
        count: existing.count + 1,
        size: existing.size + req.size,
      });
    });

    console.log('\nResource breakdown:');
    resourceTypes.forEach((stats, type) => {
      console.log(`${type}: ${stats.count} requests, ${(stats.size / 1024).toFixed(2)}KB`);
    });

    // Performance assertions
    expect(totalSize).toBeLessThan(5 * 1024 * 1024); // Less than 5MB total
    expect(slowRequests).toBeLessThan(5); // Less than 5 slow requests
    expect(totalRequests).toBeLessThan(50); // Less than 50 total requests
  });

  test('Database performance monitoring', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    // Monitor API requests for database performance
    const apiRequests: Array<{
      url: string;
      method: string;
      duration: number;
      status: number;
    }> = [];

    page.on('response', response => {
      const request = response.request();
      const timing = request.timing();

      if (request.url().includes('/api/') && timing) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          duration: timing.responseEnd,
          status: response.status(),
        });
      }
    });

    await homePage.goto();

    // Test deduplication performance with multiple scans
    const testUrl = TEST_URLS.FIXTURE_SAFE;

    // First scan (should populate database)
    const { duration: firstScanTime } = await measurePerformance(
      async () => {
        await homePage.startScan(testUrl);
        await scanPage.waitForScanCompletion();
      },
      'First scan (database write)'
    );

    // Second scan (should use deduplication)
    await homePage.goto();
    const { duration: secondScanTime } = await measurePerformance(
      async () => {
        await homePage.startScan(testUrl);
        await page.waitForURL(/\/r\/[\w-]+/, { timeout: 5000 });
      },
      'Second scan (database deduplication)'
    );

    // Analyze API performance
    const dbReadRequests = apiRequests.filter(req =>
      req.method === 'GET' && (req.url.includes('reports') || req.url.includes('scans'))
    );
    const avgDbReadTime = dbReadRequests.reduce((sum, req) => sum + req.duration, 0) / dbReadRequests.length;

    console.log('=== Database Performance Analysis ===');
    console.log(`First Scan Time: ${firstScanTime.toFixed(2)}ms`);
    console.log(`Second Scan Time (Deduped): ${secondScanTime.toFixed(2)}ms`);
    console.log(`Deduplication Speedup: ${((firstScanTime - secondScanTime) / firstScanTime * 100).toFixed(1)}%`);
    console.log(`API Requests: ${apiRequests.length}`);
    console.log(`Average DB Read Time: ${avgDbReadTime.toFixed(2)}ms`);

    // Performance assertions
    expect(secondScanTime).toBeLessThan(firstScanTime * 0.3); // Deduplication should be much faster
    expect(avgDbReadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY); // DB queries should be fast
  });

  test('Real-world performance simulation', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    // Simulate real user behavior with delays and interactions
    const userActions = [
      { action: 'load-home', delay: 2000 },
      { action: 'read-content', delay: 3000 },
      { action: 'switch-tabs', delay: 1000 },
      { action: 'enter-url', delay: 2000 },
      { action: 'start-scan', delay: 0 },
      { action: 'wait-scan', delay: 0 },
      { action: 'view-report', delay: 5000 },
      { action: 'scroll-report', delay: 2000 },
    ];

    const actionTimes: Record<string, number> = {};

    for (const step of userActions) {
      const { duration } = await measurePerformance(
        async () => {
          switch (step.action) {
            case 'load-home':
              await homePage.goto();
              break;
            case 'read-content':
              await page.waitForTimeout(step.delay);
              break;
            case 'switch-tabs':
              // Tab switching not currently implemented in UI - skip this action
              await page.waitForTimeout(500);
              break;
            case 'enter-url':
              await page.fill('input[aria-label="Scan input"]', TEST_URLS.FIXTURE_SAFE, { delay: 100 });
              break;
            case 'start-scan':
              await page.click('button:has-text("Scan Now")');
              break;
            case 'wait-scan':
              await scanPage.waitForScanCompletion();
              await scanPage.waitForReportRedirect();
              break;
            case 'view-report':
              await reportPage.waitForReportLoad();
              break;
            case 'scroll-report':
              await page.evaluate(() => {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              });
              await page.waitForTimeout(1000);
              break;
          }

          if (step.delay > 0) {
            await page.waitForTimeout(step.delay);
          }
        },
        `User action: ${step.action}`
      );

      actionTimes[step.action] = duration;
    }

    console.log('=== Real-World Performance Simulation ===');
    Object.entries(actionTimes).forEach(([action, time]) => {
      console.log(`${action}: ${time.toFixed(2)}ms`);
    });

    // Calculate total user journey time
    const totalTime = Object.values(actionTimes).reduce((sum, time) => sum + time, 0);
    console.log(`Total User Journey: ${(totalTime / 1000).toFixed(1)}s`);

    // Real-world performance should be acceptable
    expect(totalTime).toBeLessThan(30000); // Less than 30 seconds total
  });

  test('Performance regression detection', async ({ page }) => {
    // This test would ideally compare against historical baselines
    // For now, we'll establish current baselines and check for obvious issues

    const baselines = {
      homeLoad: 3000,    // 3 seconds
      scanComplete: 3000, // 3 seconds
      reportLoad: 2000,   // 2 seconds
    };

    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    // Measure current performance
    const { duration: homeLoadTime } = await measurePerformance(
      () => homePage.goto(),
      'Home page load (regression test)'
    );

    const { duration: scanTime } = await measurePerformance(
      async () => {
        await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
        await scanPage.waitForScanCompletion();
      },
      'Scan completion (regression test)'
    );

    const { duration: reportLoadTime } = await measurePerformance(
      async () => {
        await scanPage.waitForReportRedirect();
        await reportPage.waitForReportLoad();
      },
      'Report load (regression test)'
    );

    console.log('=== Performance Regression Check ===');
    console.log(`Home Load: ${homeLoadTime.toFixed(2)}ms (baseline: ${baselines.homeLoad}ms)`);
    console.log(`Scan Complete: ${scanTime.toFixed(2)}ms (baseline: ${baselines.scanComplete}ms)`);
    console.log(`Report Load: ${reportLoadTime.toFixed(2)}ms (baseline: ${baselines.reportLoad}ms)`);

    // Check for regressions (allow 20% variance)
    const regressionThreshold = 1.2;

    expect(homeLoadTime).toBeLessThan(baselines.homeLoad * regressionThreshold);
    expect(scanTime).toBeLessThan(baselines.scanComplete * regressionThreshold);
    expect(reportLoadTime).toBeLessThan(baselines.reportLoad * regressionThreshold);

    // Also check absolute requirements
    expect(homeLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD);
    expect(scanTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SCAN_COMPLETION);
    expect(reportLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD);

    // Store results for CI reporting
    await page.evaluate(results => {
      console.log('Performance regression results:', JSON.stringify(results));
    }, {
      homeLoad: { current: homeLoadTime, baseline: baselines.homeLoad, regression: homeLoadTime > baselines.homeLoad * regressionThreshold },
      scanComplete: { current: scanTime, baseline: baselines.scanComplete, regression: scanTime > baselines.scanComplete * regressionThreshold },
      reportLoad: { current: reportLoadTime, baseline: baselines.reportLoad, regression: reportLoadTime > baselines.reportLoad * regressionThreshold },
    });
  });
});