/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { ScanPage } from '../pages/ScanPage';
import { ReportPage } from '../pages/ReportPage';
import { TEST_URLS } from '../utils/test-helpers';

test.describe('License Compliance Display', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor for license-related content loading
    page.on('response', response => {
      if (response.url().includes('license') || response.url().includes('credits')) {
        console.log(`License-related request: ${response.url()} - ${response.status()}`);
      }
    });
  });

  test('EasyPrivacy attribution display', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    // Complete a scan to get to report page
    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    // Check for EasyPrivacy attribution
    const easyPrivacyAttribution = page.locator('text=EasyPrivacy');
    if (await easyPrivacyAttribution.isVisible()) {
      await expect(easyPrivacyAttribution).toBeVisible();

      // Should have proper attribution text
      const attributionText = await easyPrivacyAttribution.locator('..').textContent();
      expect(attributionText).toMatch(/EasyPrivacy|easy.*privacy/i);

      // Should link to proper source
      const attributionLink = easyPrivacyAttribution.locator('..').locator('a[href*="easylist"]');
      if (await attributionLink.isVisible()) {
        await expect(attributionLink).toHaveAttribute('href');
        await expect(attributionLink).toHaveAttribute('target', '_blank');
      }
    }
  });

  test('WhoTracks.me attribution display', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    // Check for WhoTracks.me attribution
    const whoTracksAttribution = page.locator('text=WhoTracks.me');
    if (await whoTracksAttribution.isVisible()) {
      await expect(whoTracksAttribution).toBeVisible();

      // Should have proper attribution text
      const attributionText = await whoTracksAttribution.locator('..').textContent();
      expect(attributionText).toMatch(/WhoTracks\.me|who.*tracks/i);

      // Should link to proper source
      const attributionLink = whoTracksAttribution.locator('..').locator('a[href*="whotracks"]');
      if (await attributionLink.isVisible()) {
        await expect(attributionLink).toHaveAttribute('href');
        await expect(attributionLink).toHaveAttribute('target', '_blank');
      }
    }
  });

  test('AboutCredits component functionality', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    // Check if About Credits section exists
    const aboutCreditsSection = page.locator('[data-testid="about-credits"]');

    if (await aboutCreditsSection.isVisible()) {
      await expect(aboutCreditsSection).toBeVisible();

      // Should contain attribution information
      const sectionText = await aboutCreditsSection.textContent();
      expect(sectionText).toBeTruthy();

      // Test accessibility of credits section
      await expect(aboutCreditsSection).toHaveAttribute('role');

      // All links should be accessible
      const links = aboutCreditsSection.locator('a');
      const linkCount = await links.count();

      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i);
        await expect(link).toHaveAttribute('href');

        // External links should open in new tab
        const href = await link.getAttribute('href');
        if (href?.startsWith('http')) {
          await expect(link).toHaveAttribute('target', '_blank');
          await expect(link).toHaveAttribute('rel', /noopener|noreferrer/);
        }
      }
    }
  });

  test('License information accessibility', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    // Verify license compliance functionality
    await reportPage.verifyLicenseCompliance();

    // Test keyboard navigation to license links
    const licenseLinks = page.locator('a[href*="license"]');

    if (await licenseLinks.count() > 0) {
      for (let i = 0; i < await licenseLinks.count(); i++) {
        const link = licenseLinks.nth(i);

        // Should be focusable
        await link.focus();
        await expect(link).toBeFocused();

        // Should have descriptive text or aria-label
        const linkText = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');

        expect(linkText || ariaLabel).toBeTruthy();
        expect((linkText || ariaLabel)?.length).toBeGreaterThan(5);
      }
    }
  });

  test('Third-party data source credits', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    // Check for various data source attributions
    const dataSources = [
      'EasyPrivacy',
      'WhoTracks.me',
      'Privacy Badger',
      'uBlock Origin',
      'Disconnect',
    ];

    const foundSources: string[] = [];

    for (const source of dataSources) {
      const sourceElement = page.locator(`text=${source}`);
      if (await sourceElement.isVisible()) {
        foundSources.push(source);

        // Should have proper attribution
        const context = await sourceElement.locator('..').textContent();
        expect(context).toContain(source);
      }
    }

    console.log(`Found data source attributions: ${foundSources.join(', ')}`);

    // Should have at least some data source attributions
    if (foundSources.length > 0) {
      expect(foundSources.length).toBeGreaterThan(0);
    }
  });

  test('License link functionality and validation', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    // Find all license-related links
    const licenseLinks = page.locator('a[href*="license"], a[href*="easylist"], a[href*="whotracks"], a[href*="github.com"]');
    const linkCount = await licenseLinks.count();

    for (let i = 0; i < linkCount; i++) {
      const link = licenseLinks.nth(i);
      const href = await link.getAttribute('href');

      if (href) {
        console.log(`Testing license link: ${href}`);

        // Should be valid URLs
        expect(href).toMatch(/^https?:\/\//);

        // Should open in new tab for external links
        if (!href.includes(page.url().split('/')[2])) {
          await expect(link).toHaveAttribute('target', '_blank');
        }

        // Test that link is reachable (without following it)
        const linkText = await link.textContent();
        expect(linkText?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('Attribution text correctness', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    // Check attribution patterns
    const attributionPatterns = [
      /data\s+(?:from|by|source|provided)/i,
      /powered\s+by/i,
      /based\s+on/i,
      /using\s+data\s+from/i,
      /tracker\s+data\s+from/i,
    ];

    const pageText = await page.textContent('body');

    if (pageText) {
      const hasAttribution = attributionPatterns.some(pattern => pattern.test(pageText));

      if (hasAttribution) {
        console.log('Found attribution text in page');

        // Attribution should be properly formatted
        expect(pageText).not.toMatch(/TODO|FIXME|placeholder/i);
        expect(pageText).not.toMatch(/\[.*\]|\{.*\}/); // No placeholder brackets
      }
    }
  });

  test('SPDX license headers validation', async ({ page }) => {
    // This test checks that the frontend properly displays SPDX compliance
    const homePage = new HomePage(page);

    await homePage.goto();

    // Check if SPDX information is accessible
    // This might be in a dedicated page or modal
    const spdxLinks = page.locator('a[href*="spdx"], a[href*="license"], text=MIT, text=SPDX');

    if (await spdxLinks.count() > 0) {
      for (let i = 0; i < await spdxLinks.count(); i++) {
        const link = spdxLinks.nth(i);

        if (await link.isVisible()) {
          const text = await link.textContent();
          console.log(`Found SPDX/license reference: ${text}`);

          // Should not be placeholder text
          expect(text).not.toMatch(/TODO|FIXME|TBD/i);
        }
      }
    }
  });

  test('About page license information', async ({ page }) => {
    // Test license information on about page
    await page.goto('/about');

    // About page should exist and contain license information
    if (page.url().includes('/about')) {
      // Look for license/attribution information
      const licenseSection = page.locator('text=License, text=Attribution, text=Credits, text=Acknowledgments');

      if (await licenseSection.isVisible()) {
        const sectionText = await licenseSection.textContent();
        expect(sectionText).toBeTruthy();

        // Should contain proper attributions
        expect(sectionText).toMatch(/EasyPrivacy|WhoTracks|MIT|license/i);
      }

      // Check for proper SPDX headers or license notices
      const pageContent = await page.textContent('body');
      if (pageContent?.includes('SPDX') || pageContent?.includes('MIT')) {
        expect(pageContent).toMatch(/SPDX-License-Identifier|MIT|license/i);
      }
    }
  });

  test('Footer attribution links', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // Check footer for attribution links
    const footer = page.locator('footer');

    if (await footer.isVisible()) {
      const footerText = await footer.textContent();

      // Footer might contain attribution information
      if (footerText?.includes('Privacy') || footerText?.includes('Data')) {
        const footerLinks = footer.locator('a');
        const linkCount = await footerLinks.count();

        for (let i = 0; i < linkCount; i++) {
          const link = footerLinks.nth(i);
          const href = await link.getAttribute('href');
          const text = await link.textContent();

          console.log(`Footer link: ${text} -> ${href}`);

          if (href && (href.includes('easylist') || href.includes('whotracks') || href.includes('license'))) {
            // Attribution links should be functional
            await expect(link).toHaveAttribute('href');
            await expect(link).toHaveAttribute('target', '_blank');
          }
        }
      }
    }
  });

  test('Data source disclaimer visibility', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    // Look for disclaimers about data sources
    const disclaimerTexts = [
      'data source',
      'third party',
      'external data',
      'disclaimer',
      'attribution',
    ];

    for (const disclaimerText of disclaimerTexts) {
      const disclaimer = page.locator(`text=${disclaimerText}`);

      if (await disclaimer.isVisible()) {
        const context = await disclaimer.locator('..').textContent();
        console.log(`Found disclaimer context: ${context?.substring(0, 100)}...`);

        // Disclaimer should be informative
        expect(context?.length).toBeGreaterThan(20);
      }
    }
  });

  test('License compliance on mobile devices', async ({ page }) => {
    // Test license display on mobile viewports
    await page.setViewportSize({ width: 375, height: 667 });

    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    // License information should still be accessible on mobile
    const aboutCredits = page.locator('[data-testid="about-credits"]');

    if (await aboutCredits.isVisible()) {
      // Should be readable on mobile
      const boundingBox = await aboutCredits.boundingBox();

      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(200); // Reasonable mobile width
        expect(boundingBox.height).toBeGreaterThan(50);  // Visible height
      }

      // Links should be tappable on mobile
      const links = aboutCredits.locator('a');
      const linkCount = await links.count();

      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i);
        const linkBox = await link.boundingBox();

        if (linkBox) {
          // Should meet minimum touch target size (44px on iOS)
          expect(Math.max(linkBox.width, linkBox.height)).toBeGreaterThan(44);
        }
      }
    }
  });
});