import { test, expect } from '@playwright/test';

/**
 * Critical Diagnostic Tests for Stage Environment
 * Focus on the most critical issues discovered
 */

test.describe('Stage Critical Diagnosis', () => {

  test('CSP Configuration Check', async ({ page }) => {
    const cspViolations: any[] = [];

    page.on('console', (msg) => {
      if (msg.text().toLowerCase().includes('content security policy') ||
          msg.text().toLowerCase().includes('refused to apply inline style')) {
        cspViolations.push(msg.text());
      }
    });

    await page.goto('https://stage.geckoadvisor.com');
    await page.waitForTimeout(3000);

    console.log('\n=== CSP VIOLATIONS DETECTED ===');
    console.log(`Total violations: ${cspViolations.length}`);

    if (cspViolations.length > 0) {
      console.log('\nFirst 5 violations:');
      cspViolations.slice(0, 5).forEach((v, i) => {
        console.log(`${i + 1}. ${v}`);
      });
    }

    // Get CSP header
    const response = await page.goto('https://stage.geckoadvisor.com');
    const cspHeader = response?.headers()['content-security-policy'];

    console.log('\n=== CSP HEADER ===');
    console.log(cspHeader || 'No CSP header found');

    // Check environment
    const envCheck = await page.evaluate(() => {
      return {
        url: window.location.href,
        userAgent: navigator.userAgent
      };
    });

    console.log('\n=== ENVIRONMENT ===');
    console.log(JSON.stringify(envCheck, null, 2));
  });

  test('Scan Flow Quick Test', async ({ page }) => {
    await page.goto('https://stage.geckoadvisor.com');

    // Find input using multiple strategies
    const inputSelectors = [
      'input[type="text"]',
      'input[type="url"]',
      'input[placeholder*="domain"]',
      'input[placeholder*="URL"]',
      'input[placeholder*="website"]',
      '[data-testid*="scan-input"]',
      '[data-testid*="url-input"]'
    ];

    let input = null;
    for (const selector of inputSelectors) {
      const elem = page.locator(selector).first();
      if (await elem.count() > 0) {
        input = elem;
        console.log(`Found input with selector: ${selector}`);
        break;
      }
    }

    if (!input) {
      console.log('Available inputs on page:');
      const allInputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input')).map(inp => ({
          type: inp.type,
          placeholder: inp.placeholder,
          name: inp.name,
          id: inp.id
        }));
      });
      console.log(JSON.stringify(allInputs, null, 2));
    }

    expect(input).toBeTruthy();
  });

  test('About Page Attribution Check', async ({ page }) => {
    await page.goto('https://stage.geckoadvisor.com/about');

    const content = await page.content();

    // Check for Inter Font
    const hasInter = content.includes('Inter') || content.includes('inter');

    // Check for EasyPrivacy
    const hasEasyPrivacy = content.toLowerCase().includes('easyprivacy') ||
                          content.toLowerCase().includes('easy privacy');

    // Check for WhoTracks.me
    const hasWhoTracksMe = content.toLowerCase().includes('whotracks') ||
                          content.toLowerCase().includes('who tracks');

    // Check for Public Suffix List
    const hasPSL = content.toLowerCase().includes('public suffix list') ||
                   content.toLowerCase().includes('publicsuffix');

    console.log('\n=== ATTRIBUTION CHECK ===');
    console.log(`Inter Font: ${hasInter}`);
    console.log(`EasyPrivacy: ${hasEasyPrivacy}`);
    console.log(`WhoTracks.me: ${hasWhoTracksMe}`);
    console.log(`Public Suffix List: ${hasPSL}`);

    // Search for specific sections
    const sections = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'));
      return headings.map(h => h.textContent?.trim()).filter(Boolean);
    });

    console.log('\n=== PAGE SECTIONS ===');
    sections.forEach(s => console.log(`- ${s}`));
  });

  test('LICENSE-THIRD-PARTY.md Access', async ({ page }) => {
    const licenseResponse = await page.goto('https://stage.geckoadvisor.com/LICENSE-THIRD-PARTY.md');

    console.log('\n=== LICENSE FILE CHECK ===');
    console.log(`Status: ${licenseResponse?.status()}`);
    console.log(`Content-Type: ${licenseResponse?.headers()['content-type']}`);

    if (licenseResponse?.status() === 404) {
      // Try alternative paths
      const altPaths = [
        '/LICENSE-THIRD-PARTY',
        '/licenses/LICENSE-THIRD-PARTY.md',
        '/public/LICENSE-THIRD-PARTY.md'
      ];

      for (const path of altPaths) {
        const resp = await page.goto(`https://stage.geckoadvisor.com${path}`);
        console.log(`${path}: ${resp?.status()}`);
      }
    }
  });

  test('Performance Snapshot', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('https://stage.geckoadvisor.com', { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource');

      return {
        navigation: {
          domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
          loadComplete: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
          domInteractive: Math.round(perfData.domInteractive - perfData.fetchStart),
        },
        resourceCount: resources.length,
        resourcesByType: resources.reduce((acc, r) => {
          const type = (r as any).initiatorType;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
    });

    console.log('\n=== PERFORMANCE METRICS ===');
    console.log(`Total load time: ${loadTime}ms`);
    console.log(`DOM Interactive: ${metrics.navigation.domInteractive}ms`);
    console.log(`DOM Content Loaded: ${metrics.navigation.domContentLoaded}ms`);
    console.log(`Load Complete: ${metrics.navigation.loadComplete}ms`);
    console.log(`Total resources: ${metrics.resourceCount}`);
    console.log('\nResources by type:');
    console.log(JSON.stringify(metrics.resourcesByType, null, 2));
  });
});
