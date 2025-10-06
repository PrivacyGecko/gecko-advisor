/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Page, expect } from '@playwright/test';

/**
 * Test data constants
 */
export const TEST_URLS = {
  // Real domains for full E2E testing
  VALID_HTTP: 'http://example.com',
  VALID_HTTPS: 'https://example.com',

  // Test fixture domains (should return mock data quickly)
  FIXTURE_SAFE: 'https://safe.test',
  FIXTURE_MEDIUM_RISK: 'https://medium.test',
  FIXTURE_HIGH_RISK: 'https://high.test',

  // Edge cases
  INVALID_URL: 'not-a-url',
  NONEXISTENT_DOMAIN: 'https://this-domain-definitely-does-not-exist-12345.com',

  // Security test cases
  XSS_ATTEMPT: 'https://example.com<script>alert("xss")</script>',
  SQL_INJECTION: "https://example.com'; DROP TABLE scans; --",
} as const;

/**
 * Performance thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  SCAN_COMPLETION: 3000, // 3 seconds max
  PAGE_LOAD: 5000, // 5 seconds max
  DATABASE_QUERY: 50, // 50ms max for deduplication
} as const;

/**
 * Accessibility test configuration
 */
export const A11Y_CONFIG = {
  rules: {
    // WCAG AA compliance
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-management': { enabled: true },
    'screen-reader': { enabled: true },
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
} as const;

/**
 * Wait for element with custom timeout and better error messaging
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options?: {
    timeout?: number;
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
  }
) {
  const timeout = options?.timeout || 10000;
  const state = options?.state || 'visible';

  try {
    await page.waitForSelector(selector, { timeout, state });
  } catch (error) {
    throw new Error(
      `Element "${selector}" not found in ${state} state within ${timeout}ms. ` +
      `Page URL: ${page.url()}`
    );
  }
}

/**
 * Wait for network to be idle (no requests for specified duration)
 */
export async function waitForNetworkIdle(page: Page, timeout = 2000) {
  await page.waitForLoadState('networkidle');
  // Additional wait to ensure all async operations complete
  await page.waitForTimeout(timeout);
}

/**
 * Measure performance timing for a specific operation
 */
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  name: string
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await operation();
  const duration = performance.now() - startTime;

  console.log(`⏱️  ${name}: ${duration.toFixed(2)}ms`);

  return { result, duration };
}

/**
 * Take screenshot with custom naming
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options?: { fullPage?: boolean; clip?: { x: number; y: number; width: number; height: number } }
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = `test-results/screenshots/${name}-${timestamp}.png`;

  await page.screenshot({
    path: screenshotPath,
    fullPage: options?.fullPage || false,
    clip: options?.clip,
  });

  console.log(`📸 Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

/**
 * Check for console errors and warnings
 */
export async function checkConsoleErrors(page: Page, ignorePatterns: string[] = []) {
  const messages: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      const text = msg.text();

      // Skip ignored patterns
      const shouldIgnore = ignorePatterns.some(pattern => text.includes(pattern));
      if (!shouldIgnore) {
        messages.push(`${msg.type()}: ${text}`);
      }
    }
  });

  return messages;
}

/**
 * Simulate slow network conditions
 */
export async function simulateSlowNetwork(page: Page) {
  // Simulate slow 3G connection
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 500 * 1024, // 500kb/s
    uploadThroughput: 500 * 1024,
    latency: 400, // 400ms
  });
}

/**
 * Reset network conditions to normal
 */
export async function resetNetworkConditions(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.disable');
}

/**
 * Generate random test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);

  return {
    url: `https://test-${random}-${timestamp}.example.com`,
    email: `test-${random}@example.com`,
    timestamp,
    random,
  };
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) throw error;

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Retrying operation in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('This should never be reached');
}

/**
 * Assert element text with better error messaging
 */
export async function assertElementText(
  page: Page,
  selector: string,
  expectedText: string | RegExp,
  options?: { timeout?: number; exact?: boolean }
) {
  const element = page.locator(selector);

  if (typeof expectedText === 'string') {
    if (options?.exact) {
      await expect(element).toHaveText(expectedText, { timeout: options?.timeout });
    } else {
      await expect(element).toContainText(expectedText, { timeout: options?.timeout });
    }
  } else {
    await expect(element).toHaveText(expectedText, { timeout: options?.timeout });
  }
}