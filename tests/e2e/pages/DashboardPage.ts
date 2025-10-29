// SPDX-License-Identifier: MIT
import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Dashboard/Account Page
 * Handles scan history and user account information
 */
export class DashboardPage {
  readonly page: Page;
  readonly pageUrl: string;

  // Main elements
  readonly accountHeader: Locator;
  readonly userEmail: Locator;

  // Feature indicators
  readonly scanLimitIndicator: Locator;
  readonly scanHistorySection: Locator;
  readonly scanHistoryItems: Locator;

  // Scan controls
  readonly newScanButton: Locator;
  readonly scanInput: Locator;
  readonly scanSubmitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageUrl = '/dashboard';

    // Main elements
    this.accountHeader = page.locator('[data-testid="account-header"]');
    this.userEmail = page.locator('[data-testid="user-email"]');

    // Feature indicators
    this.scanLimitIndicator = page.locator('[data-testid="scan-limit"]');
    this.scanHistorySection = page.locator('[data-testid="scan-history"]');
    this.scanHistoryItems = this.scanHistorySection.locator('[data-testid*="scan-item"]');

    // Scan controls
    this.newScanButton = page.getByRole('button', { name: /new scan/i });
    this.scanInput = page.locator('[data-testid="scan-input"]');
    this.scanSubmitButton = page.locator('[data-testid="scan-submit"]');
  }

  /**
   * Navigate to dashboard page
   */
  async goto(): Promise<void> {
    await this.page.goto(this.pageUrl);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify dashboard page is loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await expect(this.accountHeader).toBeVisible({ timeout: 10000 });
  }

  /**
   * Get scan limit information
   */
  async getScanLimit(): Promise<string> {
    const limitText = await this.scanLimitIndicator.textContent();
    return limitText?.trim() || '';
  }

  /**
   * Verify scan limit display
   */
  async verifyScanLimit(): Promise<void> {
    const limitText = await this.scanLimitIndicator.textContent();
    expect(limitText).toMatch(/\d+.*day|daily.*\d+/i);
  }

  /**
   * Get scan history count
   */
  async getScanHistoryCount(): Promise<number> {
    try {
      const items = await this.scanHistoryItems.all();
      return items.length;
    } catch {
      return 0;
    }
  }

  /**
   * Verify scan history retention
   */
  async verifyScanHistoryRetention(): Promise<void> {
    await expect(this.scanHistorySection).toBeVisible();

    // Look for retention period indicator
    const retentionText = await this.scanHistorySection.locator('[data-testid="retention-period"]').textContent();
    expect(retentionText).toMatch(/\d+.*day/i);
  }

  /**
   * Get user email from dashboard
   */
  async getUserEmail(): Promise<string> {
    const email = await this.userEmail.textContent();
    return email?.trim() || '';
  }

  /**
   * Get all scan history items with details
   */
  async getScanHistory(): Promise<Array<{
    url: string;
    date: string;
    score: number | null;
  }>> {
    const items = await this.scanHistoryItems.all();
    const history: Array<{ url: string; date: string; score: number | null }> = [];

    for (const item of items) {
      const url = await item.locator('[data-testid="scan-url"]').textContent();
      const date = await item.locator('[data-testid="scan-date"]').textContent();
      const scoreText = await item.locator('[data-testid="scan-score"]').textContent();
      const score = scoreText ? parseFloat(scoreText) : null;

      history.push({
        url: url?.trim() || '',
        date: date?.trim() || '',
        score
      });
    }

    return history;
  }

  /**
   * Click on a scan history item
   */
  async clickScanHistoryItem(index: number): Promise<void> {
    const items = await this.scanHistoryItems.all();
    if (index < items.length) {
      await items[index].click();
      await this.page.waitForLoadState('networkidle');
    } else {
      throw new Error(`Scan history item at index ${index} not found`);
    }
  }
}
