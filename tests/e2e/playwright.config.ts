import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Global timeout for each test */
  timeout: 60_000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 10_000,
  },

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }],
    ...(process.env.CI ? [['github']] : [['list']]),
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL for all tests - now using Nginx reverse proxy on port 8080 */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Browser action defaults */
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  /* Global test setup */
  globalSetup: resolve(__dirname, './global-setup.ts'),
  globalTeardown: resolve(__dirname, './global-teardown.ts'),

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Mobile devices */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Tablet devices */
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] },
    },
  ],

  /* Output directories */
  outputDir: 'test-results/',

  /* Web server configuration for local development */
  webServer: process.env.CI ? undefined : {
    command: 'pnpm dev',
    port: 8080,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    url: 'http://localhost:8080/health',
  },
});

