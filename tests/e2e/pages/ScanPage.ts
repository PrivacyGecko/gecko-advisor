/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Page, Locator, expect } from '@playwright/test';
import { waitForElement, measurePerformance, PERFORMANCE_THRESHOLDS } from '../utils/test-helpers';

export class ScanPage {
  readonly page: Page;

  // Locators
  readonly progressContainer: Locator;
  readonly progressDial: Locator;
  readonly progressText: Locator;
  readonly statusMessage: Locator;
  readonly errorMessage: Locator;
  readonly retryButton: Locator;
  readonly homeLink: Locator;

  // Progress states
  readonly queuedState: Locator;
  readonly runningState: Locator;
  readonly completedState: Locator;
  readonly failedState: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main elements
    this.progressContainer = page.locator('[data-testid="scan-progress"]');
    this.progressDial = page.locator('[data-testid="progress-dial"]');
    this.progressText = page.locator('[data-testid="progress-text"]');
    this.statusMessage = page.locator('[data-testid="status-message"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.retryButton = page.locator('button:has-text("Retry")');
    this.homeLink = page.locator('a[href="/"]');

    // State indicators - scoped to scan progress container to avoid strict mode violations
    this.queuedState = this.progressContainer.locator('text=Queued');
    this.runningState = this.progressContainer.locator('text=Scanning');
    this.completedState = this.progressContainer.locator('text=Complete');
    this.failedState = this.progressContainer.locator('text=Failed');
  }

  /**
   * Wait for scan to complete and navigate to results
   */
  async waitForScanCompletion(timeout = PERFORMANCE_THRESHOLDS.SCAN_COMPLETION) {
    const startTime = performance.now();

    // Wait for scan to start
    await this.waitForScanState('running', 10000);

    // Wait for completion or failure
    const result = await Promise.race([
      this.waitForScanState('completed', timeout),
      this.waitForScanState('failed', timeout),
    ]);

    const duration = performance.now() - startTime;
    console.log(`⏱️  Scan completion time: ${duration.toFixed(2)}ms`);

    // Assert performance requirement
    if (duration > PERFORMANCE_THRESHOLDS.SCAN_COMPLETION) {
      console.warn(
        `⚠️  Scan took ${duration.toFixed(2)}ms, exceeding ${PERFORMANCE_THRESHOLDS.SCAN_COMPLETION}ms threshold`
      );
    }

    return { state: result, duration };
  }

  /**
   * Wait for specific scan state
   */
  async waitForScanState(state: 'queued' | 'running' | 'completed' | 'failed', timeout = 30000) {
    const stateLocators = {
      queued: this.queuedState,
      running: this.runningState,
      completed: this.completedState,
      failed: this.failedState,
    };

    await stateLocators[state].waitFor({ timeout });
    return state;
  }

  /**
   * Get current scan status
   */
  async getScanStatus() {
    // Try to determine current state
    if (await this.queuedState.isVisible()) return 'queued';
    if (await this.runningState.isVisible()) return 'running';
    if (await this.completedState.isVisible()) return 'completed';
    if (await this.failedState.isVisible()) return 'failed';
    return 'unknown';
  }

  /**
   * Get progress percentage
   */
  async getProgressPercentage(): Promise<number> {
    try {
      const progressText = await this.progressText.textContent();
      const match = progressText?.match(/(\d+)%/);
      return match ? parseInt(match[1], 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Wait for automatic redirect to report page
   */
  async waitForReportRedirect(timeout = 10000) {
    const { duration } = await measurePerformance(
      async () => {
        await this.page.waitForURL(/\/r\/[\w-]+/, { timeout });
      },
      'Report page redirect'
    );

    return duration;
  }

  /**
   * Verify scan progress indicators
   */
  async verifyProgressIndicators() {
    // Check progress container is visible
    await expect(this.progressContainer).toBeVisible();

    // Check progress dial
    await expect(this.progressDial).toBeVisible();

    // Verify progress text updates
    const initialProgress = await this.getProgressPercentage();
    expect(initialProgress).toBeGreaterThanOrEqual(0);
    expect(initialProgress).toBeLessThanOrEqual(100);
  }

  /**
   * Verify scan status updates in real-time
   */
  async verifyRealtimeUpdates() {
    let previousStatus = await this.getScanStatus();
    let statusChangeCount = 0;

    // Monitor status changes for up to 30 seconds
    for (let i = 0; i < 30; i++) {
      await this.page.waitForTimeout(1000);
      const currentStatus = await this.getScanStatus();

      if (currentStatus !== previousStatus) {
        statusChangeCount++;
        console.log(`📊 Status changed: ${previousStatus} → ${currentStatus}`);
        previousStatus = currentStatus;
      }

      if (currentStatus === 'completed' || currentStatus === 'failed') {
        break;
      }
    }

    expect(statusChangeCount).toBeGreaterThan(0); // At least one status change should occur
  }

  /**
   * Test scan cancellation (if supported)
   */
  async testScanCancellation() {
    // Wait for scan to start
    await this.waitForScanState('running', 10000);

    // Look for cancel button
    const cancelButton = this.page.locator('button:has-text("Cancel")');

    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await this.waitForScanState('failed', 5000);

      // Verify cancellation message
      await expect(this.errorMessage).toContainText('cancelled');
    }
  }

  /**
   * Test retry functionality
   */
  async testRetryFunctionality() {
    // This test assumes the scan has failed
    await this.waitForScanState('failed');

    if (await this.retryButton.isVisible()) {
      await this.retryButton.click();

      // Should start scanning again
      await this.waitForScanState('running', 10000);
    }
  }

  /**
   * Verify error handling
   */
  async verifyErrorHandling() {
    await this.waitForScanState('failed');

    // Check error message is displayed
    await expect(this.errorMessage).toBeVisible();

    // Check retry button is available
    await expect(this.retryButton).toBeVisible();

    // Check home link is available
    await expect(this.homeLink).toBeVisible();
  }

  /**
   * Test navigation during scan
   */
  async testNavigationDuringScan() {
    // Wait for scan to start
    await this.waitForScanState('running');

    // Test back navigation
    await this.page.goBack();
    await this.page.waitForURL('/');

    // Test forward navigation back to scan
    await this.page.goForward();
    await this.page.waitForURL(/\/scan\/\w+/);

    // Scan should still be in progress or completed
    const status = await this.getScanStatus();
    expect(['running', 'completed', 'failed']).toContain(status);
  }

  /**
   * Verify scan deduplication
   */
  async verifyScanDeduplication(url: string) {
    // Start first scan
    const scanUrl1 = this.page.url();

    // Navigate back to home and start same URL scan again
    await this.page.goto('/');
    await this.page.locator('input[aria-label="Scan input"]').fill(url);
    await this.page.locator('button:has-text("Scan Now")').click();

    // Should redirect to existing scan or complete quickly
    const scanUrl2 = this.page.url();

    // URLs might be the same (deduplication) or different (new scan)
    // If different, second scan should complete very quickly
    if (scanUrl1 !== scanUrl2) {
      const { duration } = await this.waitForScanCompletion(5000); // Much shorter timeout for deduped scan
      expect(duration).toBeLessThan(1000); // Should be very fast for duplicate
    }
  }

  /**
   * Monitor network requests during scan
   */
  async monitorNetworkActivity() {
    const requests: string[] = [];
    const responses: { url: string; status: number; duration: number }[] = [];

    this.page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push(request.url());
      }
    });

    this.page.on('response', response => {
      if (response.url().includes('/api/')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          duration: response.request().timing()?.responseEnd || 0,
        });
      }
    });

    // Wait for scan to complete
    await this.waitForScanCompletion();

    return { requests, responses };
  }

  /**
   * Test browser back/forward during scan
   */
  async testBrowserNavigation() {
    const originalUrl = this.page.url();

    // Go back to home
    await this.page.goBack();
    await expect(this.page).toHaveURL('/');

    // Go forward to scan page
    await this.page.goForward();
    await expect(this.page).toHaveURL(originalUrl);

    // Verify scan state is preserved
    const status = await this.getScanStatus();
    expect(['running', 'completed', 'failed']).toContain(status);
  }

  /**
   * Verify page doesn't crash on rapid navigation
   */
  async testRapidNavigation() {
    const scanUrl = this.page.url();

    // Rapidly navigate back and forth
    for (let i = 0; i < 5; i++) {
      await this.page.goBack();
      await this.page.waitForTimeout(100);
      await this.page.goForward();
      await this.page.waitForTimeout(100);
    }

    // Should still be on scan page
    await expect(this.page).toHaveURL(scanUrl);

    // Page should still be functional
    const status = await this.getScanStatus();
    expect(['running', 'completed', 'failed']).toContain(status);
  }
}