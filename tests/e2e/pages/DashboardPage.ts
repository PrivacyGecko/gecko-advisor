import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Dashboard/Account Page
 * Handles PRO feature verification and scan history
 */
export class DashboardPage {
  readonly page: Page;
  readonly pageUrl: string;

  // Main elements
  readonly accountHeader: Locator;
  readonly userEmail: Locator;
  readonly proBadge: Locator;
  readonly upgradeButton: Locator;

  // PRO feature indicators
  readonly scanLimitIndicator: Locator;
  readonly scanHistorySection: Locator;
  readonly scanHistoryItems: Locator;

  // Scan controls
  readonly newScanButton: Locator;
  readonly scanInput: Locator;
  readonly scanSubmitButton: Locator;

  // PRO-only features
  readonly privateScanToggle: Locator;
  readonly advancedInsightsSection: Locator;
  readonly prioritySupportBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageUrl = '/dashboard';

    // Main elements
    this.accountHeader = page.locator('[data-testid="account-header"]');
    this.userEmail = page.locator('[data-testid="user-email"]');
    this.proBadge = page.locator('[data-testid="pro-badge"]');
    this.upgradeButton = page.getByRole('button', { name: /upgrade/i });

    // PRO feature indicators
    this.scanLimitIndicator = page.locator('[data-testid="scan-limit"]');
    this.scanHistorySection = page.locator('[data-testid="scan-history"]');
    this.scanHistoryItems = this.scanHistorySection.locator('[data-testid*="scan-item"]');

    // Scan controls
    this.newScanButton = page.getByRole('button', { name: /new scan/i });
    this.scanInput = page.locator('[data-testid="scan-input"]');
    this.scanSubmitButton = page.locator('[data-testid="scan-submit"]');

    // PRO-only features
    this.privateScanToggle = page.locator('[data-testid="private-scan-toggle"]');
    this.advancedInsightsSection = page.locator('[data-testid="advanced-insights"]');
    this.prioritySupportBadge = page.locator('[data-testid="priority-support"]');
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
   * Check if user has PRO access
   */
  async hasProAccess(): Promise<boolean> {
    try {
      await expect(this.proBadge).toBeVisible({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify PRO badge is displayed
   */
  async verifyProBadge(): Promise<void> {
    await expect(this.proBadge).toBeVisible();
    const badgeText = await this.proBadge.textContent();
    expect(badgeText?.toLowerCase()).toContain('pro');
  }

  /**
   * Get scan limit information
   */
  async getScanLimit(): Promise<{
    limit: string;
    isUnlimited: boolean;
  }> {
    const limitText = await this.scanLimitIndicator.textContent();
    const isUnlimited = limitText?.toLowerCase().includes('unlimited') || false;

    return {
      limit: limitText?.trim() || '',
      isUnlimited
    };
  }

  /**
   * Verify unlimited scans for PRO users
   */
  async verifyUnlimitedScans(): Promise<void> {
    const { isUnlimited } = await this.getScanLimit();
    expect(isUnlimited).toBe(true);
  }

  /**
   * Verify FREE user scan limit (3 scans per day)
   */
  async verifyFreeScanLimit(): Promise<void> {
    const limitText = await this.scanLimitIndicator.textContent();
    expect(limitText).toMatch(/3.*day|daily.*3/i);
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
   * @param isPro - If true, expects 90-day history; if false, expects 7-day history
   */
  async verifyScanHistoryRetention(isPro: boolean): Promise<void> {
    await expect(this.scanHistorySection).toBeVisible();

    // Look for retention period indicator
    const retentionText = await this.scanHistorySection.locator('[data-testid="retention-period"]').textContent();

    if (isPro) {
      expect(retentionText).toMatch(/90.*day/i);
    } else {
      expect(retentionText).toMatch(/7.*day/i);
    }
  }

  /**
   * Verify private scan toggle is available (PRO only)
   */
  async verifyPrivateScanToggle(): Promise<void> {
    await expect(this.privateScanToggle).toBeVisible();
    await expect(this.privateScanToggle).toBeEnabled();
  }

  /**
   * Verify private scan toggle is locked (FREE users)
   */
  async verifyPrivateScanLocked(): Promise<void> {
    // Should show upgrade prompt or locked state
    const lockedIndicator = this.page.locator('[data-testid="private-scan-locked"]');
    await expect(lockedIndicator).toBeVisible();
  }

  /**
   * Perform a scan and check for PRO features
   */
  async performScanAndVerifyProFeatures(url: string): Promise<{
    hasAdvancedInsights: boolean;
    hasPrivateScanOption: boolean;
    hasPrioritySupport: boolean;
  }> {
    // Perform scan
    await this.scanInput.fill(url);
    await this.scanSubmitButton.click();

    // Wait for scan to complete
    await this.page.waitForURL(/.*\/report\/.*/);

    // Check for PRO features
    const hasAdvancedInsights = await this.advancedInsightsSection.isVisible().catch(() => false);
    const hasPrivateScanOption = await this.privateScanToggle.isVisible().catch(() => false);
    const hasPrioritySupport = await this.prioritySupportBadge.isVisible().catch(() => false);

    return {
      hasAdvancedInsights,
      hasPrivateScanOption,
      hasPrioritySupport
    };
  }

  /**
   * Get user email from dashboard
   */
  async getUserEmail(): Promise<string> {
    const email = await this.userEmail.textContent();
    return email?.trim() || '';
  }

  /**
   * Verify upgrade button is NOT shown (PRO users)
   */
  async verifyNoUpgradeButton(): Promise<void> {
    await expect(this.upgradeButton).not.toBeVisible();
  }

  /**
   * Verify upgrade button is shown (FREE users)
   */
  async verifyUpgradeButtonVisible(): Promise<void> {
    await expect(this.upgradeButton).toBeVisible();
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
