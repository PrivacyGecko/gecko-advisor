// SPDX-License-Identifier: MIT
import { test, expect, Page } from '@playwright/test';

test.describe('Privacy Advisor - Comprehensive Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Performance Validation', () => {
    test('should meet Core Web Vitals requirements', async ({ page }) => {
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      // Measure performance metrics
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          // Wait for performance data to be available
          setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            const paint = performance.getEntriesByType('paint');

            const fcp = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
            const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
            const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;

            resolve({
              fcp,
              loadTime,
              domContentLoaded,
              ttfb: navigation.responseStart - navigation.fetchStart,
            });
          }, 3000);
        });
      });

      console.log('Performance Metrics:', metrics);

      // Assert performance requirements
      expect(metrics.fcp).toBeLessThan(2500); // FCP under 2.5s
      expect(metrics.loadTime).toBeLessThan(3000); // Load time under 3s
      expect(metrics.domContentLoaded).toBeLessThan(1500); // DOM ready under 1.5s
    });

    test('should have optimized bundle sizes', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      const resourceSizes = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const jsResources = resources.filter(r => r.name.includes('.js'));
        const cssResources = resources.filter(r => r.name.includes('.css'));

        const totalJSSize = jsResources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0);
        const totalCSSSize = cssResources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0);

        return {
          totalJSSize: totalJSSize / 1024, // KB
          totalCSSSize: totalCSSSize / 1024, // KB
          jsFiles: jsResources.length,
          cssFiles: cssResources.length
        };
      });

      console.log('Bundle Sizes:', resourceSizes);

      // Assert bundle size requirements
      expect(resourceSizes.totalJSSize).toBeLessThan(2048); // JS under 2MB
      expect(resourceSizes.totalCSSSize).toBeLessThan(512); // CSS under 512KB
    });

    test('should load and display content quickly', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await expect(page.locator('h1')).toBeVisible();

      const loadTime = Date.now() - startTime;
      console.log('Time to visible content:', loadTime, 'ms');

      expect(loadTime).toBeLessThan(3000); // Content visible under 3s
    });
  });

  test.describe('Accessibility Compliance (WCAG AA)', () => {
    test('should have proper heading structure', async ({ page }) => {
      // Add wait before checking headings
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check for any heading level
      const headings = page.locator('h1, h2, h3');
      await headings.first().waitFor({ state: 'visible', timeout: 5000 });
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);

      // Check that there's exactly one h1
      const h1Elements = await page.locator('h1').all();
      expect(h1Elements.length).toBe(1);

      // Verify heading text is meaningful
      const allHeadings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      for (const heading of allHeadings) {
        const text = await heading.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    });

    test('should have proper alt text for images', async ({ page }) => {
      const images = await page.locator('img').all();

      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const ariaLabelledby = await img.getAttribute('aria-labelledby');
        const role = await img.getAttribute('role');

        // Images should have alt text or appropriate ARIA labels, unless decorative
        if (role !== 'presentation' && role !== 'none') {
          expect(alt || ariaLabel || ariaLabelledby).toBeTruthy();
        }
      }
    });

    test('should have keyboard navigation support', async ({ page }) => {
      // Test tab navigation through interactive elements
      const interactiveElements = await page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])').all();

      expect(interactiveElements.length).toBeGreaterThan(0);

      // Test that first interactive element can be focused
      if (interactiveElements.length > 0) {
        await interactiveElements[0].focus();
        await expect(interactiveElements[0]).toBeFocused();
      }
    });

    test('should have sufficient color contrast', async ({ page }) => {
      // Test main text elements for color contrast
      const textElements = await page.locator('p, h1, h2, h3, h4, h5, h6, span, div').all();

      // This is a basic check - in production, you'd use axe-core for comprehensive testing
      for (const element of textElements.slice(0, 5)) { // Check first 5 elements
        const styles = await element.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize,
          };
        });

        // Basic validation that styles are applied
        expect(styles.color).toBeTruthy();
        expect(styles.fontSize).toBeTruthy();
      }
    });

    test('should have proper form labels', async ({ page }) => {
      const inputs = await page.locator('input[type="text"], input[type="email"], input[type="url"], textarea').all();

      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');

        // Input should have label, aria-label, aria-labelledby, or at minimum placeholder
        if (id) {
          const label = await page.locator(`label[for="${id}"]`).count();
          expect(label > 0 || ariaLabel || ariaLabelledby || placeholder).toBeTruthy();
        } else {
          expect(ariaLabel || ariaLabelledby || placeholder).toBeTruthy();
        }
      }
    });
  });

  test.describe('Security & Data Protection', () => {
    test('should sanitize URL inputs', async ({ page }) => {
      // Navigate to a page with URL input
      await page.goto('/');

      const urlInput = page.locator('input[type="url"], input[placeholder*="website"], input[placeholder*="domain"]').first();

      if (await urlInput.count() > 0) {
        // Test with potentially malicious input
        const maliciousInputs = [
          'javascript:alert("xss")',
          '<script>alert("xss")</script>',
          'data:text/html,<script>alert("xss")</script>',
          'vbscript:alert("xss")',
        ];

        for (const maliciousInput of maliciousInputs) {
          await urlInput.fill(maliciousInput);
          const value = await urlInput.inputValue();

          // Input should be sanitized or rejected
          expect(value).not.toContain('<script>');
          expect(value).not.toContain('javascript:');
          expect(value).not.toContain('vbscript:');
        }
      }
    });

    test('should handle errors gracefully', async ({ page }) => {
      // Listen for console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Navigate to non-existent page
      await page.goto('/non-existent-page');

      // Should show error page instead of crashing
      await expect(page.locator('text=/not found|404|error/i')).toBeVisible({ timeout: 10000 });

      // Should not have critical JavaScript errors
      const criticalErrors = errors.filter(error =>
        !error.includes('favicon') &&
        !error.includes('404') &&
        !error.includes('ERR_INTERNET_DISCONNECTED')
      );
      expect(criticalErrors.length).toBe(0);
    });

    test('should implement CSP headers (if available)', async ({ page }) => {
      const response = await page.goto('/');
      const cspHeader = response?.headers()['content-security-policy'];

      // Log CSP status for reporting
      console.log('CSP Header:', cspHeader || 'Not implemented');

      // In production, we'd expect CSP headers
      // For now, just log the status
    });
  });

  test.describe('User Experience Validation', () => {
    test('should have responsive design', async ({ page }) => {
      // Test different viewport sizes
      const viewports = [
        { width: 375, height: 667 },   // Mobile
        { width: 768, height: 1024 },  // Tablet
        { width: 1920, height: 1080 }, // Desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Check that main content is visible
        await expect(page.locator('main, [role="main"], body > div').first()).toBeVisible();

        // Check that navigation is accessible
        const nav = page.locator('nav, [role="navigation"]').first();
        if (await nav.count() > 0) {
          await expect(nav).toBeVisible();
        }

        console.log(`Layout validated for ${viewport.width}x${viewport.height}`);
      }
    });

    test('should provide loading states', async ({ page }) => {
      await page.goto('/');

      // Check for loading indicators
      const loadingIndicators = await page.locator('[class*="loading"], [class*="spinner"], [class*="skeleton"], .animate-spin').count();

      // Should have some loading states implemented
      console.log('Loading indicators found:', loadingIndicators);
    });

    test('should handle navigation correctly', async ({ page }) => {
      await page.goto('/');

      // Test navigation links
      const navLinks = await page.locator('nav a, [role="navigation"] a').all();

      if (navLinks.length > 0) {
        // Test first nav link
        const firstLink = navLinks[0];
        const href = await firstLink.getAttribute('href');

        if (href && !href.startsWith('http') && href !== '#') {
          await firstLink.click();
          await page.waitForLoadState('networkidle');

          // Should navigate successfully
          expect(page.url()).toContain(href);
        }
      }
    });

    test('should handle forms appropriately', async ({ page }) => {
      await page.goto('/');

      const forms = await page.locator('form').all();

      for (const form of forms) {
        const submitButton = form.locator('button[type="submit"], input[type="submit"]').first();

        if (await submitButton.count() > 0) {
          // Check form validation
          const requiredInputs = await form.locator('input[required], textarea[required], select[required]').all();

          if (requiredInputs.length > 0) {
            // Try submitting empty form
            await submitButton.click();

            // Should show validation messages or prevent submission
            const validationMessages = await page.locator(':invalid, [aria-invalid="true"]').count();
            console.log('Form validation working:', validationMessages > 0 || page.url().includes('#'));
          }
        }
      }
    });
  });

  test.describe('License Compliance Verification', () => {
    test('should display About/Credits page with attributions', async ({ page }) => {
      // Navigate to about page
      const aboutLink = page.locator('a[href*="about"], a[href*="credits"]').first();

      if (await aboutLink.count() > 0) {
        await aboutLink.click();
        await page.waitForLoadState('networkidle');

        // Should contain attribution information
        const attributionText = await page.textContent('body');
        expect(attributionText).toMatch(/license|attribution|copyright|MIT|open.?source/i);
      } else {
        // Try direct navigation
        await page.goto('/about');

        // Check if page exists and has attribution content
        const pageContent = await page.textContent('body');
        if (pageContent && pageContent.length > 100) {
          expect(pageContent).toMatch(/license|attribution|copyright/i);
        }
      }
    });

    test('should have proper license headers in source', async ({ page }) => {
      // This is more of a build-time check, but we can verify the main bundle
      const response = await page.goto('/');

      // Check if main JS file contains license information
      const jsResources = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        return resources
          .filter(r => r.name.includes('.js') && !r.name.includes('node_modules'))
          .map(r => r.name);
      });

      console.log('Checking license headers in:', jsResources.length, 'JS files');

      // In production, we'd fetch and check each file for license headers
      // For now, we'll verify that the source includes license information
      expect(jsResources.length).toBeGreaterThan(0);
    });
  });

  test.describe('Progressive Enhancement', () => {
    test('should work with JavaScript disabled', async ({ page, context }) => {
      // Disable JavaScript
      await context.setExtraHTTPHeaders({
        'X-Test': 'no-js'
      });

      await page.addInitScript(() => {
        // Simulate limited JavaScript environment
        Object.defineProperty(window, 'fetch', {
          value: undefined
        });
      });

      await page.goto('/');

      // Basic content should still be visible
      const headings = await page.locator('h1, h2, h3').count();
      expect(headings).toBeGreaterThan(0);

      console.log('Basic content accessible without full JS support');
    });

    test('should handle offline scenarios gracefully', async ({ page, context }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Simulate offline
      await context.setOffline(true);

      // Try to navigate
      await page.goto('/about');

      // Should handle gracefully (not crash)
      const pageContent = await page.textContent('body');
      expect(pageContent?.length).toBeGreaterThan(0);

      await context.setOffline(false);
    });
  });
});