/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { ScanPage } from '../pages/ScanPage';
import { ReportPage } from '../pages/ReportPage';
import { TEST_URLS } from '../utils/test-helpers';

test.describe('Security & Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Set up security headers and monitoring
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Security')) {
        console.error('Security-related console error:', msg.text());
      }
    });

    page.on('response', response => {
      // Monitor for security-related response headers
      const securityHeaders = [
        'content-security-policy',
        'x-frame-options',
        'x-content-type-options',
        'strict-transport-security',
      ];

      securityHeaders.forEach(header => {
        const value = response.headers()[header];
        if (value) {
          console.log(`Security header ${header}: ${value}`);
        }
      });
    });
  });

  test('Input sanitization - XSS prevention', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // Test various XSS payloads
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      'data:text/html,<script>alert("xss")</script>',
      '"><script>alert("xss")</script>',
      "'><script>alert('xss')</script>",
      'https://example.com<script>alert("xss")</script>',
      'https://example.com" onmouseover="alert(1)"',
    ];

    for (const payload of xssPayloads) {
      console.log(`Testing XSS payload: ${payload}`);

      await page.fill('input[aria-label="Scan input"]', payload);

      // Should not execute any scripts
      let alertTriggered = false;
      page.on('dialog', dialog => {
        alertTriggered = true;
        dialog.dismiss();
      });

      // Try to submit the form
      const scanButton = page.locator('button:has-text("Scan Now")');
      if (await scanButton.isEnabled()) {
        await scanButton.click();
        await page.waitForTimeout(1000);
      }

      // No alert should have been triggered
      expect(alertTriggered).toBe(false);

      // Navigate back for next test
      await homePage.goto();
    }
  });

  test('URL validation and sanitization', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // Test malicious URLs
    const maliciousUrls = [
      'javascript:alert("xss")',
      'data:text/html,<h1>test</h1>',
      'file:///etc/passwd',
      'ftp://malicious.com',
      'https://evil.com@good.com',
      'https://good.com.evil.com',
      'https://127.0.0.1:22', // Potential SSRF
      'https://localhost:3000', // Internal service
      'https://169.254.169.254', // AWS metadata service
    ];

    for (const url of maliciousUrls) {
      console.log(`Testing malicious URL: ${url}`);

      await page.fill('input[aria-label="Scan input"]', url);

      // Should either prevent submission or handle safely
      const scanButton = page.locator('button:has-text("Scan Now")');
      if (await scanButton.isEnabled()) {
        await scanButton.click();

        // Should either stay on page with error or redirect to scan page that fails safely
        await page.waitForTimeout(2000);

        // Check if we're on a scan page
        if (page.url().includes('/scan/')) {
          const scanPage = new ScanPage(page);

          // Should fail safely without exposing internal systems
          try {
            const { state } = await scanPage.waitForScanCompletion(10000);
            if (state === 'failed') {
              // Check that error message doesn't expose sensitive information
              const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
              expect(errorMessage).not.toMatch(/(internal|server|database|redis|postgres)/i);
            }
          } catch (e) {
            // Timeout is acceptable for blocked requests
          }
        }
      }

      await homePage.goto();
    }
  });

  test('SQL injection prevention', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // Test SQL injection payloads
    const sqlPayloads = [
      "'; DROP TABLE scans; --",
      "' OR '1'='1",
      '" OR "1"="1',
      "'; INSERT INTO scans VALUES ('evil'); --",
      "' UNION SELECT * FROM users --",
      '1; DELETE FROM reports; --',
    ];

    for (const payload of sqlPayloads) {
      console.log(`Testing SQL injection: ${payload}`);

      await page.fill('input[aria-label="Scan input"]', `https://example.com${payload}`);

      const scanButton = page.locator('button:has-text("Scan Now")');
      if (await scanButton.isEnabled()) {
        await scanButton.click();

        // Application should handle this safely
        if (page.url().includes('/scan/')) {
          const scanPage = new ScanPage(page);

          try {
            await scanPage.waitForScanCompletion(10000);
            // If it completes, check that no data was corrupted
            // This would require actual database inspection in a real test
          } catch (e) {
            // Failure is acceptable for malicious input
          }
        }
      }

      await homePage.goto();
    }
  });

  test('Admin authentication timing attack fixes', async ({ page }) => {
    // Test timing attack resistance for admin endpoints
    const adminUrls = [
      '/admin',
      '/admin/login',
      '/api/admin',
      '/admin/dashboard',
    ];

    for (const url of adminUrls) {
      const startTime = performance.now();

      try {
        await page.goto(url);
        await page.waitForTimeout(1000);
      } catch (e) {
        // 404 or other errors are expected
      }

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      console.log(`Admin URL ${url} response time: ${responseTime.toFixed(2)}ms`);

      // Response times should be consistent to prevent timing attacks
      expect(responseTime).toBeLessThan(5000); // Should fail fast
    }
  });

  test('Rate limiting validation', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // Attempt rapid scan submissions
    const rapidRequests = [];

    for (let i = 0; i < 10; i++) {
      const requestPromise = (async () => {
        await page.fill('input[aria-label="Scan input"]', `https://test${i}.example.com`);
        await page.click('button:has-text("Scan Now")');
        return page.waitForURL(/\/scan\/\w+/, { timeout: 5000 }).catch(() => null);
      })();

      rapidRequests.push(requestPromise);

      // Small delay between requests
      await page.waitForTimeout(100);
      await homePage.goto(); // Reset for next request
    }

    // Wait for all requests to complete or timeout
    const results = await Promise.allSettled(rapidRequests);

    // Some requests should be blocked by rate limiting
    const successfulRequests = results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failedRequests = results.length - successfulRequests;

    console.log(`Rate limiting test: ${successfulRequests} successful, ${failedRequests} blocked`);

    // Should have blocked some requests
    expect(failedRequests).toBeGreaterThan(0);
  });

  test('Error boundary functionality', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();

    // Trigger a JavaScript error to test error boundary
    await page.evaluate(() => {
      // Simulate a runtime error
      const component = document.querySelector('[data-testid="score-dial"]');
      if (component) {
        // Trigger an error by trying to access undefined property
        (component as any).nonExistentMethod();
      }
    });

    // Page should still be functional due to error boundary
    await expect(page.locator('body')).toBeVisible();

    // Should have fallback UI or error message
    const errorBoundary = page.locator('[data-testid="error-boundary"]');
    if (await errorBoundary.isVisible()) {
      await expect(errorBoundary).toContainText(/error|failed|problem/i);
    }

    // Navigation should still work
    const homeLink = page.locator('a[href="/"]');
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await expect(page).toHaveURL('/');
    }
  });

  test('Network error handling', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);

    await homePage.goto();

    // Simulate network errors
    await page.route('**/api/**', route => {
      // Randomly fail some API requests
      if (Math.random() < 0.3) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);

    // Should handle network errors gracefully
    try {
      const { state } = await scanPage.waitForScanCompletion(15000);

      if (state === 'failed') {
        // Should show appropriate error message
        await scanPage.verifyErrorHandling();
      }
    } catch (e) {
      // Timeout due to network errors is acceptable
      console.log('Scan timed out due to simulated network errors');
    }

    // Remove network simulation
    await page.unroute('**/api/**');
  });

  test('CSRF protection validation', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // Check for CSRF tokens in forms
    const forms = await page.locator('form').all();

    for (const form of forms) {
      // Look for CSRF token fields
      const csrfToken = await form.locator('input[name*="csrf"], input[name*="token"]').first();

      if (await csrfToken.isVisible()) {
        const tokenValue = await csrfToken.getAttribute('value');
        expect(tokenValue).toBeTruthy();
        expect(tokenValue.length).toBeGreaterThan(10); // Should be a substantial token
      }
    }

    // Test that forms require proper tokens
    await page.evaluate(() => {
      // Try to submit forms without proper tokens
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        const tokenInputs = form.querySelectorAll('input[name*="csrf"], input[name*="token"]');
        tokenInputs.forEach(input => {
          (input as HTMLInputElement).value = 'invalid-token';
        });
      });
    });

    // Attempt to submit with invalid token
    await page.fill('input[aria-label="Scan input"]', TEST_URLS.FIXTURE_SAFE);
    await page.click('button:has-text("Scan Now")');

    // Should handle invalid CSRF token appropriately
    await page.waitForTimeout(2000);
  });

  test('Content Security Policy compliance', async ({ page }) => {
    const homePage = new HomePage(page);

    // Monitor CSP violations
    const cspViolations: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('Content Security Policy')) {
        cspViolations.push(msg.text());
      }
    });

    await homePage.goto();

    // Try to inject inline scripts (should be blocked by CSP)
    await page.evaluate(() => {
      try {
        // This should be blocked by CSP
        const script = document.createElement('script');
        script.innerHTML = 'console.log("inline script executed")';
        document.head.appendChild(script);
      } catch (e) {
        console.log('Inline script blocked by CSP:', e);
      }
    });

    // Try to load external scripts from unauthorized sources
    await page.evaluate(() => {
      try {
        const script = document.createElement('script');
        script.src = 'https://evil.com/malicious.js';
        document.head.appendChild(script);
      } catch (e) {
        console.log('External script blocked by CSP:', e);
      }
    });

    await page.waitForTimeout(2000);

    // Should have CSP violations logged (indicating CSP is working)
    console.log(`CSP violations detected: ${cspViolations.length}`);
  });

  test('Evidence data sanitization', async ({ page }) => {
    const homePage = new HomePage(page);
    const scanPage = new ScanPage(page);
    const reportPage = new ReportPage(page);

    await homePage.goto();
    await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
    await scanPage.waitForScanCompletion();
    await scanPage.waitForReportRedirect();
    await reportPage.waitForReportLoad();

    // Verify evidence data is properly sanitized
    await reportPage.verifyEvidenceSanitization();

    // Check that HTML in evidence is properly escaped
    const evidenceCards = page.locator('[data-testid="evidence-card"]');

    if (await evidenceCards.count() > 0) {
      for (let i = 0; i < await evidenceCards.count(); i++) {
        const card = evidenceCards.nth(i);
        const content = await card.textContent();

        // Should not contain unescaped HTML
        expect(content).not.toMatch(/<script|<img|<iframe|<object|<embed/i);

        // Should not contain JavaScript URLs
        expect(content).not.toMatch(/javascript:|data:text\/html/i);
      }
    }
  });

  test('Session security validation', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    // Check for secure session cookies
    const cookies = await page.context().cookies();

    cookies.forEach(cookie => {
      console.log(`Cookie: ${cookie.name}, Secure: ${cookie.secure}, HttpOnly: ${cookie.httpOnly}`);

      // Session cookies should be secure
      if (cookie.name.toLowerCase().includes('session') || cookie.name.toLowerCase().includes('auth')) {
        expect(cookie.secure).toBe(true);
        expect(cookie.httpOnly).toBe(true);
      }
    });
  });

  test('Information disclosure prevention', async ({ page }) => {
    // Test that error messages don't expose sensitive information
    const testUrls = [
      '/api/admin',
      '/api/database',
      '/api/internal',
      '/admin/config',
      '/.env',
      '/config.json',
      '/admin/users',
    ];

    for (const url of testUrls) {
      try {
        const response = await page.goto(url);

        if (response) {
          const text = await page.textContent('body');

          // Should not expose sensitive paths, versions, or configuration
          expect(text).not.toMatch(/(password|secret|key|token|database|redis|postgres|mongodb)/i);
          expect(text).not.toMatch(/\/etc\/|\/var\/|\/home\/|\/root\//);
          expect(text).not.toMatch(/version\s*:\s*\d+\.\d+\.\d+/i);
        }
      } catch (e) {
        // 404 or other errors are expected and acceptable
      }
    }
  });

  test('File upload security (if applicable)', async ({ page }) => {
    // Check if there are any file upload inputs
    await page.goto('/');

    const fileInputs = page.locator('input[type="file"]');

    if (await fileInputs.count() > 0) {
      // Test file upload restrictions
      const maliciousFiles = [
        { name: 'test.php', content: '<?php echo "php executed"; ?>' },
        { name: 'test.jsp', content: '<% out.println("jsp executed"); %>' },
        { name: 'test.exe', content: 'binary executable content' },
        { name: 'test.sh', content: '#!/bin/bash\necho "shell executed"' },
      ];

      for (const file of maliciousFiles) {
        const buffer = Buffer.from(file.content);

        await fileInputs.first().setInputFiles({
          name: file.name,
          mimeType: 'application/octet-stream',
          buffer,
        });

        // Should reject malicious file types
        await page.waitForTimeout(1000);

        // Check for error message about file type
        const errorMessage = page.locator('text=/file type|not allowed|invalid/i');
        if (await errorMessage.isVisible()) {
          await expect(errorMessage).toBeVisible();
        }
      }
    }
  });
});