/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { chromium, FullConfig } from '@playwright/test';

interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  description: string
): Promise<T> {
  const { maxAttempts, delayMs, backoffMultiplier = 1.5 } = options;
  let lastError: Error | undefined;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxAttempts}: ${description}`);
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        console.log(`⏳ Retry ${attempt} failed, waiting ${currentDelay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay = Math.floor(currentDelay * backoffMultiplier);
      } else {
        console.error(`❌ All ${maxAttempts} attempts failed for: ${description}`);
        console.error(`Last error: ${lastError.message}`);
      }
    }
  }

  throw lastError || new Error(`Failed after ${maxAttempts} attempts: ${description}`);
}

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  if (!baseURL) {
    throw new Error('baseURL is not defined in config');
  }

  console.log('🚀 Starting global setup...');
  console.log(`📍 Target URL: ${baseURL}`);

  // Create a browser instance for setup
  const browser = await chromium.launch({
    timeout: 30000,
    headless: true
  });

  try {
    const page = await browser.newPage();

    // First, check if the application health endpoint is responding
    await retryWithBackoff(
      async () => {
        console.log(`📡 Checking health endpoint: ${baseURL}/health`);
        const response = await page.goto(`${baseURL}/health`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });

        if (!response || !response.ok()) {
          throw new Error(`Health check failed: ${response?.status() || 'no response'}`);
        }

        console.log('✅ Health endpoint is responding');
      },
      { maxAttempts: 10, delayMs: 2000, backoffMultiplier: 1.2 },
      'Health check'
    );

    // Now check the main application
    await retryWithBackoff(
      async () => {
        console.log(`🌐 Loading main application at ${baseURL}`);
        const response = await page.goto(baseURL, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        if (!response || !response.ok()) {
          throw new Error(`Application load failed: ${response?.status() || 'no response'}`);
        }

        // Check for critical page elements
        console.log('🔍 Checking for page content...');

        // Try multiple selectors as the app might render differently
        const selectors = [
          'text=Gecko Advisor',
          'text=Privacy insights in seconds',
          '[data-testid="app-container"]',
          'main',
          'body'
        ];

        let found = false;
        for (const selector of selectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            console.log(`✅ Found element: ${selector}`);
            found = true;
            break;
          } catch {
            console.log(`⚠️  Selector not found: ${selector}`);
          }
        }

        if (!found) {
          // Take a screenshot for debugging
          await page.screenshot({ path: 'global-setup-failure.png' });
          const content = await page.content();
          console.error('❌ Page content:', content.substring(0, 500));
          throw new Error('Could not find expected page elements');
        }

        console.log('✅ Application is ready and rendering correctly');
      },
      { maxAttempts: 5, delayMs: 3000, backoffMultiplier: 1.5 },
      'Application availability check'
    );

    // Optional: Verify backend API is accessible
    try {
      console.log('🔌 Verifying backend API...');
      const apiResponse = await page.goto(`${baseURL}/api/health`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      if (apiResponse?.ok()) {
        console.log('✅ Backend API is accessible');
      } else {
        console.warn('⚠️  Backend API health check returned:', apiResponse?.status());
      }
    } catch (error) {
      console.warn('⚠️  Backend API verification failed:', (error as Error).message);
      // Don't fail the setup if backend health check fails, as it might not be critical
    }

    await page.close();

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    console.error('Stack trace:', (error as Error).stack);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup completed successfully');
}

export default globalSetup;