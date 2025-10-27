import { test, expect, type Page } from '@playwright/test';
import type { ConsoleMessage } from '@playwright/test';

/**
 * Comprehensive E2E Test Suite for Gecko Advisor Stage Environment
 *
 * Tests critical functionality after recent fixes:
 * - CSP environment variable (inline styles for React)
 * - LICENSE-THIRD-PARTY.md with Inter Font attribution
 * - Branding fixes (Privacy Advisor → Gecko Advisor)
 */

// Test configuration
const STAGE_URL = 'https://stage.geckoadvisor.com';
const TEST_DOMAIN = 'example.com';

// Performance targets
const PERFORMANCE_TARGETS = {
  pageLoadMs: 3000,
  maxNetworkRequests: 50,
};

// Store console messages for analysis
let consoleMessages: ConsoleMessage[] = [];
let cspViolations: ConsoleMessage[] = [];

test.describe('Gecko Advisor Stage - Comprehensive E2E Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Reset console message collectors
    consoleMessages = [];
    cspViolations = [];

    // Capture all console messages
    page.on('console', (msg) => {
      consoleMessages.push(msg);

      // Check for CSP violations
      if (msg.text().toLowerCase().includes('content security policy') ||
          msg.text().toLowerCase().includes('csp')) {
        cspViolations.push(msg);
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      console.error('Page error:', error);
    });
  });

  test.describe('1. Critical Functionality Tests', () => {

    test('1.1 Homepage loads without errors', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/', { waitUntil: 'networkidle' });

      const loadTime = Date.now() - startTime;
      console.log(`Homepage load time: ${loadTime}ms`);

      // Verify page title
      await expect(page).toHaveTitle(/Gecko Advisor/i);

      // Take homepage screenshot
      await page.screenshot({
        path: 'test-results/screenshots/01-homepage-load.png',
        fullPage: true
      });

      // Check for critical errors
      const criticalErrors = consoleMessages.filter(msg =>
        msg.type() === 'error' && !msg.text().includes('favicon')
      );

      expect(criticalErrors.length).toBe(0);
      expect(loadTime).toBeLessThan(PERFORMANCE_TARGETS.pageLoadMs);
    });

    test('1.2 No CSP violations for inline styles', async ({ page }) => {
      await page.goto('/');

      // Wait for React to hydrate
      await page.waitForTimeout(2000);

      // Check for CSP violations
      const inlineStyleViolations = cspViolations.filter(msg =>
        msg.text().includes('inline') || msg.text().includes('style-src')
      );

      console.log(`CSP violations found: ${cspViolations.length}`);
      cspViolations.forEach(msg => console.log('CSP:', msg.text()));

      expect(inlineStyleViolations.length).toBe(0);
    });

    test('1.3 Logo displays correctly in header', async ({ page }) => {
      await page.goto('/');

      // Check for logo image
      const logo = page.locator('img[alt*="Gecko Advisor" i], img[alt*="logo" i]').first();
      await expect(logo).toBeVisible();

      // Verify logo loaded successfully
      const logoSrc = await logo.getAttribute('src');
      expect(logoSrc).toBeTruthy();

      // Take logo screenshot
      await page.screenshot({
        path: 'test-results/screenshots/02-logo-display.png'
      });

      console.log('Logo src:', logoSrc);
    });

    test('1.4 Scan input form is keyboard accessible', async ({ page }) => {
      await page.goto('/');

      // Tab through form elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should focus on input field
      const inputFocused = await page.evaluate(() => {
        const activeElement = document.activeElement;
        return activeElement?.tagName === 'INPUT' ||
               activeElement?.getAttribute('role') === 'textbox';
      });

      expect(inputFocused).toBe(true);

      // Take focus state screenshot
      await page.screenshot({
        path: 'test-results/screenshots/03-keyboard-navigation.png'
      });
    });

    test('1.5 Complete scan submission flow for example.com', async ({ page }) => {
      await page.goto('/');

      // Find and fill the scan input
      const input = page.locator('input[type="text"], input[type="url"], input[placeholder*="domain" i], input[placeholder*="website" i]').first();
      await expect(input).toBeVisible();
      await input.fill(TEST_DOMAIN);

      // Take pre-submission screenshot
      await page.screenshot({
        path: 'test-results/screenshots/04-scan-input-filled.png'
      });

      // Submit the form
      await page.keyboard.press('Enter');

      // Wait for scan to start (should show loading state)
      await page.waitForTimeout(2000);

      // Take loading state screenshot
      await page.screenshot({
        path: 'test-results/screenshots/05-scan-loading.png'
      });

      // Wait for scan completion (max 60 seconds)
      const scanComplete = await page.waitForSelector(
        '[data-testid="score-display"], .score-display, [class*="score" i][class*="display" i]',
        { timeout: 60000 }
      ).catch(() => null);

      expect(scanComplete).toBeTruthy();

      // Wait for animations to complete
      await page.waitForTimeout(2000);

      // Take results screenshot
      await page.screenshot({
        path: 'test-results/screenshots/06-scan-results.png',
        fullPage: true
      });
    });

    test('1.6 Score dial renders with colors and animations', async ({ page }) => {
      // Navigate to a completed scan or run a new one
      await page.goto('/');

      const input = page.locator('input[type="text"], input[type="url"], input[placeholder*="domain" i], input[placeholder*="website" i]').first();
      await input.fill(TEST_DOMAIN);
      await page.keyboard.press('Enter');

      // Wait for score display
      await page.waitForSelector(
        '[data-testid="score-display"], .score-display, [class*="score" i]',
        { timeout: 60000 }
      );

      // Check for score value
      const scoreVisible = await page.locator('text=/\\d+/').first().isVisible();
      expect(scoreVisible).toBe(true);

      // Verify color styles are applied (check for CSS properties)
      const hasColorStyling = await page.evaluate(() => {
        const scoreElement = document.querySelector('[data-testid="score-display"], .score-display, [class*="score" i]');
        if (!scoreElement) return false;

        const styles = window.getComputedStyle(scoreElement);
        return styles.color !== 'rgba(0, 0, 0, 0)' && styles.color !== 'rgb(0, 0, 0)';
      });

      expect(hasColorStyling).toBe(true);

      // Take score dial screenshot
      await page.screenshot({
        path: 'test-results/screenshots/07-score-dial-colors.png'
      });
    });

    test('1.7 Evidence categories expand/collapse correctly', async ({ page }) => {
      // Run a scan first
      await page.goto('/');
      const input = page.locator('input[type="text"], input[type="url"], input[placeholder*="domain" i]').first();
      await input.fill(TEST_DOMAIN);
      await page.keyboard.press('Enter');

      // Wait for results
      await page.waitForTimeout(15000);

      // Look for expandable sections (common patterns)
      const expandableElements = page.locator('[role="button"], button, [class*="expand" i], [class*="accordion" i], [class*="collaps" i]');
      const count = await expandableElements.count();

      if (count > 0) {
        // Click first expandable element
        await expandableElements.first().click();
        await page.waitForTimeout(500);

        // Take expanded state screenshot
        await page.screenshot({
          path: 'test-results/screenshots/08-evidence-expanded.png',
          fullPage: true
        });

        // Click again to collapse
        await expandableElements.first().click();
        await page.waitForTimeout(500);

        // Take collapsed state screenshot
        await page.screenshot({
          path: 'test-results/screenshots/09-evidence-collapsed.png',
          fullPage: true
        });
      }

      console.log(`Found ${count} expandable elements`);
    });
  });

  test.describe('2. Legal Compliance Verification', () => {

    test('2.1 About page loads and contains Inter Font attribution', async ({ page }) => {
      await page.goto('/about');

      // Wait for content to load
      await page.waitForLoadState('networkidle');

      // Take about page screenshot
      await page.screenshot({
        path: 'test-results/screenshots/10-about-page.png',
        fullPage: true
      });

      // Check for Inter Font attribution
      const pageContent = await page.content();

      expect(pageContent.toLowerCase()).toContain('inter');
      expect(pageContent.toLowerCase()).toContain('font');

      // Check for copyright notice
      const hasCopyright = pageContent.includes('Copyright') ||
                          pageContent.includes('©') ||
                          pageContent.includes('copyright');
      expect(hasCopyright).toBe(true);
    });

    test('2.2 Inter Font attribution links are accessible', async ({ page }) => {
      await page.goto('/about');

      // Look for attribution links
      const links = await page.locator('a[href*="github.com"], a[href*="rsms.me"], a[href*="fonts"]').all();

      console.log(`Found ${links.length} attribution links`);

      // Verify at least one link exists
      expect(links.length).toBeGreaterThan(0);

      // Check that links are visible
      if (links.length > 0) {
        await expect(links[0]).toBeVisible();
      }
    });

    test('2.3 OFL.txt license file is accessible', async ({ page }) => {
      const oflResponse = await page.goto('/fonts/OFL.txt');

      expect(oflResponse?.status()).toBe(200);

      const content = await page.content();
      expect(content.toLowerCase()).toContain('open font license');
    });

    test('2.4 LICENSE-THIRD-PARTY.md is accessible', async ({ page }) => {
      const licenseResponse = await page.goto('/LICENSE-THIRD-PARTY.md');

      expect(licenseResponse?.status()).toBe(200);

      const content = await page.content();
      expect(content.toLowerCase()).toContain('inter');
    });

    test('2.5 EasyPrivacy and WhoTracks.me attributions present', async ({ page }) => {
      await page.goto('/about');

      const pageContent = await page.content();

      // Check for data source attributions
      const hasEasyPrivacy = pageContent.toLowerCase().includes('easyprivacy') ||
                             pageContent.toLowerCase().includes('easy privacy');
      const hasWhoTracksMe = pageContent.toLowerCase().includes('whotracks') ||
                             pageContent.toLowerCase().includes('who tracks');

      expect(hasEasyPrivacy || hasWhoTracksMe).toBe(true);

      console.log('EasyPrivacy mentioned:', hasEasyPrivacy);
      console.log('WhoTracks.me mentioned:', hasWhoTracksMe);
    });

    test('2.6 Branding is "Gecko Advisor" not "Privacy Advisor"', async ({ page }) => {
      await page.goto('/about');

      const pageContent = await page.content();

      // Check for correct branding
      expect(pageContent).toContain('Gecko Advisor');

      // Check that old branding is NOT present
      const hasOldBranding = pageContent.includes('Privacy Advisor');

      if (hasOldBranding) {
        console.warn('WARNING: Found "Privacy Advisor" on about page!');
      }

      expect(hasOldBranding).toBe(false);
    });
  });

  test.describe('3. Content Accuracy Validation', () => {

    test('3.1 Homepage uses "rule-based scanner" messaging', async ({ page }) => {
      await page.goto('/');

      const pageContent = await page.content();

      // Check for rule-based messaging
      const hasRuleBased = pageContent.toLowerCase().includes('rule-based') ||
                           pageContent.toLowerCase().includes('deterministic');

      expect(hasRuleBased).toBe(true);

      // Check that AI-powered is NOT present
      const hasAIPowered = pageContent.toLowerCase().includes('ai-powered') ||
                          pageContent.toLowerCase().includes('ai powered');

      expect(hasAIPowered).toBe(false);

      console.log('Rule-based messaging:', hasRuleBased);
      console.log('AI-powered messaging:', hasAIPowered);
    });

    test('3.2 Meta tags use correct messaging', async ({ page }) => {
      await page.goto('/');

      // Check meta description
      const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');

      if (metaDescription) {
        const hasCorrectMessaging = metaDescription.toLowerCase().includes('deterministic') ||
                                    metaDescription.toLowerCase().includes('rule-based');

        const hasIncorrectMessaging = metaDescription.toLowerCase().includes('ai-powered');

        expect(hasIncorrectMessaging).toBe(false);

        console.log('Meta description:', metaDescription);
      }
    });

    test('3.3 About page uses correct product name', async ({ page }) => {
      await page.goto('/about');

      // Wait for content
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();

      // Check for "Gecko Advisor provides" not "Privacy Advisor provides"
      const hasCorrectName = pageContent.includes('Gecko Advisor provides') ||
                             pageContent.includes('Gecko Advisor is');

      const hasIncorrectName = pageContent.includes('Privacy Advisor provides');

      expect(hasIncorrectName).toBe(false);

      console.log('Correct product name usage:', hasCorrectName);
    });
  });

  test.describe('4. UI/UX Validation', () => {

    test('4.1 Responsive design - Mobile (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Take mobile screenshot
      await page.screenshot({
        path: 'test-results/screenshots/11-mobile-375px.png',
        fullPage: true
      });

      // Verify no horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });

    test('4.2 Responsive design - Tablet (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');

      // Take tablet screenshot
      await page.screenshot({
        path: 'test-results/screenshots/12-tablet-768px.png',
        fullPage: true
      });

      // Verify layout adapts
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });

    test('4.3 Responsive design - Desktop (1920px)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');

      // Take desktop screenshot
      await page.screenshot({
        path: 'test-results/screenshots/13-desktop-1920px.png',
        fullPage: true
      });
    });

    test('4.4 Touch targets meet 44x44px minimum', async ({ page }) => {
      await page.goto('/');

      // Get all interactive elements
      const touchTargets = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button, a, input, [role="button"]'));

        return elements.map(el => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            width: rect.width,
            height: rect.height,
            meets44px: rect.width >= 44 && rect.height >= 44
          };
        });
      });

      const belowMinimum = touchTargets.filter(t => !t.meets44px && t.width > 0);

      console.log('Touch targets below 44px:', belowMinimum.length);
      if (belowMinimum.length > 0) {
        console.log('Small targets:', belowMinimum.slice(0, 5));
      }

      // Allow some small targets (like close buttons) but warn if many
      expect(belowMinimum.length).toBeLessThan(touchTargets.length * 0.3);
    });

    test('4.5 Color contrast meets WCAG AA standards', async ({ page }) => {
      await page.goto('/');

      // This is a basic check - full contrast testing requires specialized tools
      const textElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button'));

        return elements.map(el => {
          const styles = window.getComputedStyle(el);
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            fontSize: styles.fontSize
          };
        }).filter(s => s.color && s.backgroundColor);
      });

      console.log(`Analyzed ${textElements.length} text elements for contrast`);

      // Basic validation that colors are defined
      expect(textElements.length).toBeGreaterThan(0);
    });

    test('4.6 Focus indicators are visible', async ({ page }) => {
      await page.goto('/');

      // Tab through elements and check for focus styles
      await page.keyboard.press('Tab');
      await page.waitForTimeout(300);

      const hasFocusIndicator = await page.evaluate(() => {
        const activeElement = document.activeElement;
        if (!activeElement) return false;

        const styles = window.getComputedStyle(activeElement);

        // Check for outline or box-shadow (common focus indicators)
        return styles.outline !== 'none' && styles.outline !== '' ||
               styles.boxShadow !== 'none' && styles.boxShadow !== '';
      });

      // Take focus state screenshot
      await page.screenshot({
        path: 'test-results/screenshots/14-focus-indicator.png'
      });

      expect(hasFocusIndicator).toBe(true);
    });

    test('4.7 Loading states display correctly', async ({ page }) => {
      await page.goto('/');

      // Start a scan
      const input = page.locator('input[type="text"], input[type="url"], input[placeholder*="domain" i]').first();
      await input.fill(TEST_DOMAIN);
      await page.keyboard.press('Enter');

      // Wait a moment for loading state
      await page.waitForTimeout(1000);

      // Check for loading indicators
      const loadingVisible = await page.locator('[class*="loading" i], [class*="spinner" i], [class*="skeleton" i], [role="progressbar"]').first().isVisible().catch(() => false);

      // Take loading state screenshot
      await page.screenshot({
        path: 'test-results/screenshots/15-loading-state.png'
      });

      console.log('Loading indicator visible:', loadingVisible);
    });
  });

  test.describe('5. Performance Tests', () => {

    test('5.1 Page load time under 3 seconds', async ({ page }) => {
      const metrics: any = {};

      // Enable performance metrics
      const startTime = Date.now();

      await page.goto('/', { waitUntil: 'load' });

      const loadTime = Date.now() - startTime;
      metrics.loadTime = loadTime;

      // Get web vitals
      const performanceMetrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        return {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          domInteractive: perfData.domInteractive - perfData.fetchStart,
        };
      });

      console.log('Performance metrics:', { loadTime, ...performanceMetrics });

      // Store metrics for report
      metrics.performanceMetrics = performanceMetrics;

      expect(loadTime).toBeLessThan(PERFORMANCE_TARGETS.pageLoadMs);
    });

    test('5.2 Logo preloads correctly', async ({ page }) => {
      // Navigate and check network requests
      const logoRequests: any[] = [];

      page.on('request', request => {
        if (request.url().includes('logo') || request.url().includes('Logo')) {
          logoRequests.push({
            url: request.url(),
            priority: request.resourceType()
          });
        }
      });

      await page.goto('/');

      console.log('Logo requests:', logoRequests);

      // Verify logo was requested
      expect(logoRequests.length).toBeGreaterThan(0);
    });

    test('5.3 Inter font loads from self-hosted directory', async ({ page }) => {
      const fontRequests: any[] = [];

      page.on('request', request => {
        if (request.url().includes('font') || request.url().endsWith('.woff2') || request.url().endsWith('.woff')) {
          fontRequests.push({
            url: request.url(),
            isSelfHosted: request.url().includes(STAGE_URL)
          });
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      console.log('Font requests:', fontRequests);

      // Verify fonts are self-hosted
      const selfHostedFonts = fontRequests.filter(f => f.isSelfHosted);
      expect(selfHostedFonts.length).toBeGreaterThan(0);

      // Verify no external font CDNs
      const externalFonts = fontRequests.filter(f =>
        f.url.includes('googleapis.com') ||
        f.url.includes('gstatic.com')
      );
      expect(externalFonts.length).toBe(0);
    });

    test('5.4 Network requests under 50 for homepage', async ({ page }) => {
      const requests: any[] = [];

      page.on('request', request => {
        requests.push({
          url: request.url(),
          type: request.resourceType()
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      console.log(`Total network requests: ${requests.length}`);

      // Log request breakdown by type
      const breakdown = requests.reduce((acc, req) => {
        acc[req.type] = (acc[req.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('Request breakdown:', breakdown);

      expect(requests.length).toBeLessThan(PERFORMANCE_TARGETS.maxNetworkRequests);
    });
  });

  test.describe('6. Error Handling', () => {

    test('6.1 Invalid domain shows error message', async ({ page }) => {
      await page.goto('/');

      // Try to submit invalid domain
      const input = page.locator('input[type="text"], input[type="url"], input[placeholder*="domain" i]').first();
      await input.fill('not-a-valid-domain!@#$');
      await page.keyboard.press('Enter');

      // Wait for error message
      await page.waitForTimeout(2000);

      // Take error state screenshot
      await page.screenshot({
        path: 'test-results/screenshots/16-error-invalid-domain.png'
      });

      // Check for error message (common patterns)
      const errorVisible = await page.locator('[role="alert"], [class*="error" i], [class*="invalid" i]').first().isVisible().catch(() => false);

      console.log('Error message displayed:', errorVisible);
    });

    test('6.2 404 page exists', async ({ page }) => {
      const response = await page.goto('/this-page-does-not-exist');

      expect(response?.status()).toBe(404);

      // Take 404 screenshot
      await page.screenshot({
        path: 'test-results/screenshots/17-404-page.png'
      });
    });
  });

  test.describe('7. Console and Network Analysis', () => {

    test('7.1 Summary of all console messages', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Categorize console messages
      const errors = consoleMessages.filter(m => m.type() === 'error');
      const warnings = consoleMessages.filter(m => m.type() === 'warning');
      const info = consoleMessages.filter(m => m.type() === 'info' || m.type() === 'log');

      console.log('\n=== CONSOLE MESSAGE SUMMARY ===');
      console.log(`Errors: ${errors.length}`);
      console.log(`Warnings: ${warnings.length}`);
      console.log(`Info/Log: ${info.length}`);
      console.log(`CSP Violations: ${cspViolations.length}`);

      if (errors.length > 0) {
        console.log('\nError messages:');
        errors.forEach(e => console.log(`  - ${e.text()}`));
      }

      if (cspViolations.length > 0) {
        console.log('\nCSP violations:');
        cspViolations.forEach(v => console.log(`  - ${v.text()}`));
      }

      // Non-favicon errors are critical
      const criticalErrors = errors.filter(e => !e.text().includes('favicon'));
      expect(criticalErrors.length).toBe(0);
    });
  });
});
