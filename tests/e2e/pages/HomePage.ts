/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Page, Locator, expect } from '@playwright/test';
import { waitForElement, measurePerformance, assertElementText } from '../utils/test-helpers';

export class HomePage {
  readonly page: Page;

  // Locators
  readonly heading: Locator;
  readonly subheading: Locator;
  readonly urlInput: Locator;
  readonly scanButton: Locator;
  readonly tabButtons: Locator;
  readonly docsLink: Locator;
  readonly recentReportsSection: Locator;
  readonly previewCards: Locator;

  // Input mode tabs
  readonly urlTab: Locator;
  readonly appTab: Locator;
  readonly addressTab: Locator;

  // Features section
  readonly featuresSection: Locator;
  readonly noTrackersIndicator: Locator;
  readonly transparentScoringIndicator: Locator;
  readonly plainLanguageIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main elements
    this.heading = page.locator('h1');
    this.subheading = page.locator('p').first();
    this.urlInput = page.locator('input[aria-label="Scan input"]');
    this.scanButton = page.locator('button:has-text("Scan Now")');
    this.docsLink = page.locator('a[href="/docs"]');

    // Tab navigation
    this.tabButtons = page.locator('[role="tablist"] button');
    this.urlTab = page.locator('button:has-text("URL")');
    this.appTab = page.locator('button:has-text("APP")');
    this.addressTab = page.locator('button:has-text("ADDRESS")');

    // Content sections
    this.recentReportsSection = page.locator('text=Recent Reports').locator('..');
    this.previewCards = page.locator('.grid .border.rounded-lg');
    this.featuresSection = page.locator('text=What do we check?').locator('..');

    // Feature indicators
    this.noTrackersIndicator = page.locator('text=No trackers added by us');
    this.transparentScoringIndicator = page.locator('text=Transparent scoring');
    this.plainLanguageIndicator = page.locator('text=Plain-language results');
  }

  /**
   * Navigate to home page
   */
  async goto() {
    const { duration } = await measurePerformance(
      async () => {
        await this.page.goto('/');
        await this.page.waitForLoadState('networkidle');
      },
      'Home page load'
    );

    // Assert page loaded correctly
    await expect(this.heading).toBeVisible();
    await assertElementText(this.page, 'h1', 'Check how safe your site, app, or wallet is');

    return duration;
  }

  /**
   * Enter URL and start scan
   */
  async startScan(url: string) {
    await this.urlInput.fill(url);
    await expect(this.scanButton).toBeEnabled();

    const { result: navigationPromise } = await measurePerformance(
      async () => {
        const navigationPromise = this.page.waitForURL(/\/scan\/\w+/);
        await this.scanButton.click();
        return navigationPromise;
      },
      'Scan initiation'
    );

    await navigationPromise;
    return this.page.url();
  }

  /**
   * Switch between input modes
   */
  async switchInputMode(mode: 'URL' | 'APP' | 'ADDRESS') {
    const tabButton = this.page.locator(`button:has-text("${mode}")`);
    await tabButton.click();
    await expect(tabButton).toHaveClass(/bg-security-blue/);

    // Verify placeholder text changes
    const expectedPlaceholders = {
      URL: 'https://example.com',
      APP: 'app id',
      ADDRESS: '0x... or address',
    };

    await expect(this.urlInput).toHaveAttribute('placeholder', expectedPlaceholders[mode]);
  }

  /**
   * Check if recent reports are displayed
   */
  async hasRecentReports(): Promise<boolean> {
    try {
      await this.recentReportsSection.waitFor({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get recent report items
   */
  async getRecentReports() {
    if (!(await this.hasRecentReports())) {
      return [];
    }

    const reportItems = await this.recentReportsSection.locator('li').all();
    const reports = [];

    for (const item of reportItems) {
      const domain = await item.locator('.font-medium').textContent();
      const timestamp = await item.locator('.text-xs.text-slate-500').textContent();
      const label = await item.locator('.rounded-full').textContent();
      const viewLink = await item.locator('a[href*="/r/"]').getAttribute('href');

      reports.push({
        domain: domain?.trim(),
        timestamp: timestamp?.trim(),
        label: label?.trim(),
        viewLink: viewLink?.trim(),
      });
    }

    return reports;
  }

  /**
   * Navigate to docs page
   */
  async goToDocs() {
    await this.docsLink.click();
    await this.page.waitForURL('/docs');
  }

  /**
   * Verify preview section displays correctly
   */
  async verifyPreviewSection() {
    // Check preview cards are visible
    await expect(this.previewCards).toHaveCount(4);

    // Verify specific preview data
    const privacyScoreCard = this.page.locator('text=Privacy Score').locator('..');
    const trackersCard = this.page.locator('text=Trackers Found').locator('..');
    const sslCard = this.page.locator('text=SSL/HTTPS').locator('..');
    const dataSharingCard = this.page.locator('text=Data Sharing').locator('..');

    await expect(privacyScoreCard).toBeVisible();
    await expect(privacyScoreCard.locator('text=72')).toBeVisible();
    await expect(privacyScoreCard.locator('text=SAFE')).toBeVisible();

    await expect(trackersCard).toBeVisible();
    await expect(trackersCard.locator('text=3')).toBeVisible();

    await expect(sslCard).toBeVisible();
    await expect(sslCard.locator('text=Valid')).toBeVisible();

    await expect(dataSharingCard).toBeVisible();
    await expect(dataSharingCard.locator('text=Medium')).toBeVisible();
  }

  /**
   * Verify features section
   */
  async verifyFeaturesSection() {
    await expect(this.featuresSection).toBeVisible();

    // Check feature indicators
    await expect(this.noTrackersIndicator).toBeVisible();
    await expect(this.transparentScoringIndicator).toBeVisible();
    await expect(this.plainLanguageIndicator).toBeVisible();

    // Check feature list
    const featuresList = this.featuresSection.locator('ul li');
    await expect(featuresList).toHaveCount(3);

    await expect(featuresList.nth(0)).toContainText('Trackers, third-parties, cookies');
    await expect(featuresList.nth(1)).toContainText('Security headers, mixed content, TLS');
    await expect(featuresList.nth(2)).toContainText('Privacy policy, basic fingerprinting signals');
  }

  /**
   * Verify accessibility features
   */
  async verifyAccessibility() {
    // Check ARIA labels
    await expect(this.urlInput).toHaveAttribute('aria-label', 'Scan input');
    await expect(this.tabButtons.first()).toHaveAttribute('role', 'tab');

    // Check tab navigation
    await this.urlTab.focus();
    await expect(this.urlTab).toBeFocused();

    // Check keyboard navigation
    await this.page.keyboard.press('Tab');
    await expect(this.urlInput).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.scanButton).toBeFocused();
  }

  /**
   * Verify mobile responsiveness
   */
  async verifyMobileLayout() {
    // Check responsive classes are applied
    const container = this.page.locator('.max-w-5xl');
    await expect(container).toBeVisible();

    // Check mobile-specific elements
    const mobileText = this.page.locator('.text-3xl.md\\:text-5xl');
    await expect(mobileText).toBeVisible();

    // Check responsive grid
    const responsiveGrid = this.page.locator('.grid.grid-cols-1.md\\:grid-cols-2');
    await expect(responsiveGrid).toBeVisible();
  }

  /**
   * Check page performance metrics
   */
  async checkPerformanceMetrics() {
    const performanceData = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      };
    });

    return performanceData;
  }

  /**
   * Verify form validation
   */
  async verifyFormValidation() {
    // Test with empty input
    await this.urlInput.fill('');
    // Scan button should still be enabled but APP/ADDRESS modes should be disabled
    await expect(this.scanButton).toBeEnabled();

    // Test with invalid URL
    await this.urlInput.fill('invalid-url');
    await expect(this.scanButton).toBeEnabled(); // Let backend handle validation

    // Test with valid URL
    await this.urlInput.fill('https://example.com');
    await expect(this.scanButton).toBeEnabled();
  }
}