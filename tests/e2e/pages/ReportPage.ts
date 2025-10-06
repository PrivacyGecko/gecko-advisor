/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Page, Locator, expect } from '@playwright/test';
import { waitForElement, measurePerformance, assertElementText } from '../utils/test-helpers';

export class ReportPage {
  readonly page: Page;

  // Main sections
  readonly reportContainer: Locator;
  readonly headerSection: Locator;
  readonly scoreSection: Locator;
  readonly evidenceSection: Locator;
  readonly aboutSection: Locator;

  // Score elements
  readonly scoreDial: Locator;
  readonly scoreValue: Locator;
  readonly scoreLabel: Locator;
  readonly severityBadge: Locator;

  // Header elements
  readonly domainTitle: Locator;
  readonly scanTimestamp: Locator;
  readonly shareButton: Locator;
  readonly copyButton: Locator;

  // Evidence elements
  readonly evidenceCards: Locator;
  readonly trackersList: Locator;
  readonly securityHeaders: Locator;
  readonly privacyPolicy: Locator;

  // Navigation
  readonly backToHomeLink: Locator;
  readonly newScanButton: Locator;

  // About credits
  readonly aboutCreditsSection: Locator;
  readonly licenseInfo: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main containers
    this.reportContainer = page.locator('[data-testid="report-container"]');
    this.headerSection = page.locator('[data-testid="report-header"]');
    this.scoreSection = page.locator('[data-testid="score-section"]');
    this.evidenceSection = page.locator('[data-testid="evidence-section"]');
    this.aboutSection = page.locator('[data-testid="about-section"]');

    // Score elements
    this.scoreDial = page.locator('[data-testid="score-dial"]');
    this.scoreValue = page.locator('[data-testid="score-value"]');
    this.scoreLabel = page.locator('[data-testid="score-label"]');
    this.severityBadge = page.locator('[data-testid="severity-badge"]');

    // Header elements
    this.domainTitle = page.locator('[data-testid="domain-title"]');
    this.scanTimestamp = page.locator('[data-testid="scan-timestamp"]');
    this.shareButton = page.locator('button:has-text("Share")');
    this.copyButton = page.locator('[data-testid="copy-button"]');

    // Evidence elements
    this.evidenceCards = page.locator('[data-testid="evidence-card"]');
    this.trackersList = page.locator('[data-testid="trackers-list"]');
    this.securityHeaders = page.locator('[data-testid="security-headers"]');
    this.privacyPolicy = page.locator('[data-testid="privacy-policy"]');

    // Navigation
    this.backToHomeLink = page.locator('a[href="/"]');
    this.newScanButton = page.locator('button:has-text("New Scan")');

    // About credits
    this.aboutCreditsSection = page.locator('[data-testid="about-credits"]');
    this.licenseInfo = page.locator('[data-testid="license-info"]');
  }

  /**
   * Wait for report to load completely
   */
  async waitForReportLoad() {
    const { duration } = await measurePerformance(
      async () => {
        await this.page.waitForLoadState('networkidle');
        await waitForElement(this.page, '[data-testid="score-dial"]');
        await waitForElement(this.page, '[data-testid="evidence-section"]');
      },
      'Report page load'
    );

    return duration;
  }

  /**
   * Get privacy score details
   */
  async getPrivacyScore() {
    await expect(this.scoreDial).toBeVisible();

    const scoreText = await this.scoreValue.textContent();
    const labelText = await this.scoreLabel.textContent();
    const badgeText = await this.severityBadge.textContent();

    const score = parseInt(scoreText?.replace(/[^\d]/g, '') || '0', 10);

    return {
      score,
      label: labelText?.trim(),
      severity: badgeText?.trim(),
    };
  }

  /**
   * Verify score dial accessibility features
   */
  async verifyScoreDialAccessibility() {
    // Check ARIA attributes
    await expect(this.scoreDial).toHaveAttribute('role', 'progressbar');
    await expect(this.scoreDial).toHaveAttribute('aria-valuemin', '0');
    await expect(this.scoreDial).toHaveAttribute('aria-valuemax', '100');

    const score = await this.getPrivacyScore();
    await expect(this.scoreDial).toHaveAttribute('aria-valuenow', score.score.toString());

    // Check pattern indicators for accessibility
    const patternIndicators = this.page.locator('[data-testid="pattern-indicator"]');
    if (await patternIndicators.count() > 0) {
      for (let i = 0; i < await patternIndicators.count(); i++) {
        const indicator = patternIndicators.nth(i);
        await expect(indicator).toHaveAttribute('aria-label');
      }
    }
  }

  /**
   * Get domain and scan information
   */
  async getScanInfo() {
    const domain = await this.domainTitle.textContent();
    const timestamp = await this.scanTimestamp.textContent();

    return {
      domain: domain?.trim(),
      timestamp: timestamp?.trim(),
    };
  }

  /**
   * Get evidence summary
   */
  async getEvidenceSummary() {
    const cards = await this.evidenceCards.all();
    const evidence = [];

    for (const card of cards) {
      const title = await card.locator('[data-testid="evidence-title"]').textContent();
      const description = await card.locator('[data-testid="evidence-description"]').textContent();
      const severity = await card.locator('[data-testid="evidence-severity"]').textContent();

      evidence.push({
        title: title?.trim(),
        description: description?.trim(),
        severity: severity?.trim(),
      });
    }

    return evidence;
  }

  /**
   * Test copy functionality
   */
  async testCopyFunctionality() {
    if (await this.copyButton.isVisible()) {
      // Get clipboard permissions if needed
      await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

      await this.copyButton.click();

      // Verify copy feedback
      await expect(this.page.locator('text=Copied!')).toBeVisible({ timeout: 2000 });

      // Get clipboard content
      const clipboardContent = await this.page.evaluate(async () => {
        return await navigator.clipboard.readText();
      });

      expect(clipboardContent).toContain(this.page.url());
    }
  }

  /**
   * Test share functionality
   */
  async testShareFunctionality() {
    if (await this.shareButton.isVisible()) {
      // Check if Web Share API is supported
      const hasWebShare = await this.page.evaluate(() => {
        return 'share' in navigator;
      });

      if (hasWebShare) {
        // Mock the share dialog
        await this.page.evaluate(() => {
          // @ts-ignore
          navigator.share = async () => Promise.resolve();
        });

        await this.shareButton.click();
        // Verify share was attempted (implementation dependent)
      }
    }
  }

  /**
   * Verify evidence data sanitization
   */
  async verifyEvidenceSanitization() {
    const evidence = await this.getEvidenceSummary();

    for (const item of evidence) {
      // Check for potential XSS patterns
      expect(item.title).not.toMatch(/<script|javascript:|data:/i);
      expect(item.description).not.toMatch(/<script|javascript:|data:/i);

      // Check for proper HTML encoding
      if (item.description?.includes('&')) {
        expect(item.description).toMatch(/&(amp|lt|gt|quot|#x?[0-9a-f]+);/i);
      }
    }
  }

  /**
   * Verify license compliance display
   */
  async verifyLicenseCompliance() {
    // Check if About Credits section exists
    if (await this.aboutCreditsSection.isVisible()) {
      // Verify EasyPrivacy attribution
      const easyPrivacyAttribution = this.page.locator('text=EasyPrivacy');
      await expect(easyPrivacyAttribution).toBeVisible();

      // Verify WhoTracks.me attribution
      const whoTracksAttribution = this.page.locator('text=WhoTracks.me');
      await expect(whoTracksAttribution).toBeVisible();

      // Check license links are clickable
      const licenseLinks = this.aboutCreditsSection.locator('a[href*="license"]');
      if (await licenseLinks.count() > 0) {
        for (let i = 0; i < await licenseLinks.count(); i++) {
          const link = licenseLinks.nth(i);
          await expect(link).toHaveAttribute('href');
          await expect(link).toHaveAttribute('target', '_blank');
        }
      }
    }
  }

  /**
   * Test responsive layout
   */
  async verifyResponsiveLayout() {
    // Check mobile layout
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(500);

    // Score section should stack vertically on mobile
    const scoreSection = this.scoreSection;
    await expect(scoreSection).toBeVisible();

    // Evidence cards should stack
    const evidenceGrid = this.page.locator('.grid');
    await expect(evidenceGrid).toBeVisible();

    // Check tablet layout
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.page.waitForTimeout(500);

    await expect(scoreSection).toBeVisible();
    await expect(evidenceGrid).toBeVisible();

    // Reset to desktop
    await this.page.setViewportSize({ width: 1280, height: 720 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    // Start from top of page
    await this.page.keyboard.press('Home');

    // Tab through interactive elements
    const interactiveElements = [
      this.copyButton,
      this.shareButton,
      this.newScanButton,
      this.backToHomeLink,
    ];

    for (const element of interactiveElements) {
      if (await element.isVisible()) {
        await this.page.keyboard.press('Tab');
        await expect(element).toBeFocused();
      }
    }
  }

  /**
   * Verify security headers information
   */
  async verifySecurityHeaders() {
    if (await this.securityHeaders.isVisible()) {
      const headerItems = await this.securityHeaders.locator('li').all();

      for (const item of headerItems) {
        const text = await item.textContent();
        expect(text).toBeTruthy();

        // Check for common security headers
        const isSecurityHeader = [
          'Content-Security-Policy',
          'X-Frame-Options',
          'X-Content-Type-Options',
          'Strict-Transport-Security',
          'Referrer-Policy',
        ].some(header => text?.includes(header));

        if (isSecurityHeader) {
          // Verify proper status indication
          expect(text).toMatch(/(Present|Missing|Partial)/i);
        }
      }
    }
  }

  /**
   * Test report data consistency
   */
  async verifyReportConsistency() {
    const score = await this.getPrivacyScore();
    const evidence = await this.getEvidenceSummary();

    // Score should be between 0-100
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);

    // Score label should match score value
    if (score.score >= 80) {
      expect(score.label?.toLowerCase()).toContain('safe');
    } else if (score.score >= 60) {
      expect(score.label?.toLowerCase()).toMatch(/(medium|warning)/i);
    } else {
      expect(score.label?.toLowerCase()).toMatch(/(high risk|danger)/i);
    }

    // Evidence should not be empty
    expect(evidence.length).toBeGreaterThan(0);

    // Each evidence item should have required fields
    evidence.forEach(item => {
      expect(item.title).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.severity).toBeTruthy();
    });
  }

  /**
   * Test error boundary handling
   */
  async testErrorBoundary() {
    // Trigger potential error by manipulating DOM
    await this.page.evaluate(() => {
      // Remove critical elements to test error boundary
      const scoreElement = document.querySelector('[data-testid="score-dial"]');
      if (scoreElement) {
        scoreElement.remove();
      }
    });

    // Page should still be functional
    await expect(this.page.locator('body')).toBeVisible();
    await expect(this.backToHomeLink).toBeVisible();
  }

  /**
   * Verify social media sharing metadata
   */
  async verifySocialMetadata() {
    // Check Open Graph tags
    const ogTitle = await this.page.locator('meta[property="og:title"]').getAttribute('content');
    const ogDescription = await this.page.locator('meta[property="og:description"]').getAttribute('content');
    const ogImage = await this.page.locator('meta[property="og:image"]').getAttribute('content');

    expect(ogTitle).toBeTruthy();
    expect(ogDescription).toBeTruthy();
    expect(ogImage).toBeTruthy();

    // Check Twitter Card tags
    const twitterCard = await this.page.locator('meta[name="twitter:card"]').getAttribute('content');
    const twitterTitle = await this.page.locator('meta[name="twitter:title"]').getAttribute('content');

    expect(twitterCard).toBeTruthy();
    expect(twitterTitle).toBeTruthy();
  }
}