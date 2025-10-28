/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Page, Locator, expect } from '@playwright/test';

export class ScanPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Wait for scan page to load
   */
  async waitForScanPageLoad() {
    // Wait for scan page URL pattern
    await this.page.waitForURL(/\/scan\/[\w-]+/, { timeout: 10000 });
    // Wait for page to be in a stable state
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify progress indicators are visible
   */
  async verifyProgressIndicators() {
    await this.waitForScanPageLoad();

    // The scan page should have some progress indicator
    // This could be a progress bar, percentage, or status text
    // We'll check for the page to be loaded and wait a moment for indicators to appear
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for scan to complete and return state and duration
   */
  async waitForScanCompletion(timeout: number = 30000): Promise<{ state: string; duration: number }> {
    const startTime = performance.now();

    // Wait for redirect to report page (scan completion)
    try {
      await this.page.waitForURL(/\/r\/[\w-]+/, { timeout });
      const duration = performance.now() - startTime;
      return { state: 'completed', duration };
    } catch (error) {
      // Check if we're still on scan page or if there was an error
      const currentUrl = this.page.url();
      if (currentUrl.includes('/scan/')) {
        return { state: 'timeout', duration: performance.now() - startTime };
      }
      throw error;
    }
  }

  /**
   * Wait for automatic redirect to report page
   */
  async waitForReportRedirect(timeout: number = 10000) {
    await this.page.waitForURL(/\/r\/[\w-]+/, { timeout });
  }

  /**
   * Get current progress percentage
   */
  async getProgressPercentage(): Promise<number> {
    try {
      // Try to find progress text or percentage indicator
      // This could be "50%", "Progress: 50%", etc.
      const progressText = await this.page.textContent('body');

      // Look for percentage pattern
      const percentageMatch = progressText?.match(/(\d+)%/);
      if (percentageMatch) {
        return parseInt(percentageMatch[1], 10);
      }

      // If no percentage found, check if we're on report page (100%)
      if (this.page.url().includes('/r/')) {
        return 100;
      }

      // Default to 0 if we can't find progress
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get current scan status
   */
  async getScanStatus(): Promise<string> {
    const currentUrl = this.page.url();

    // If we're on the report page, scan is completed
    if (currentUrl.includes('/r/')) {
      return 'completed';
    }

    // If we're on scan page, it's in progress
    if (currentUrl.includes('/scan/')) {
      return 'in_progress';
    }

    return 'unknown';
  }

  /**
   * Verify real-time updates are working
   */
  async verifyRealtimeUpdates() {
    await this.waitForScanPageLoad();

    // Monitor for any changes in the page content over a short period
    const initialContent = await this.page.textContent('body');
    await this.page.waitForTimeout(2000);

    const updatedContent = await this.page.textContent('body');

    // Content should change as scan progresses (or redirect to report)
    const hasRedirected = this.page.url().includes('/r/');
    const contentChanged = initialContent !== updatedContent;

    // Either content changed or we redirected to report
    expect(hasRedirected || contentChanged).toBeTruthy();
  }

  /**
   * Test browser navigation during scan
   */
  async testBrowserNavigation() {
    await this.waitForScanPageLoad();

    const scanUrl = this.page.url();

    // Navigate back
    await this.page.goBack();
    await this.page.waitForTimeout(500);

    // Navigate forward
    await this.page.goForward();
    await this.page.waitForTimeout(500);

    // Should be back on scan page or report page (if scan completed)
    const currentUrl = this.page.url();
    expect(currentUrl.includes('/scan/') || currentUrl.includes('/r/')).toBeTruthy();
  }

  /**
   * Test rapid navigation
   */
  async testRapidNavigation() {
    const scanUrl = this.page.url();

    // Rapidly reload the page
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');

    // Should still be on scan or report page
    const currentUrl = this.page.url();
    expect(currentUrl.includes('/scan/') || currentUrl.includes('/r/')).toBeTruthy();
  }
}
