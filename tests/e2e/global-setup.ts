/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  if (!baseURL) {
    throw new Error('baseURL is not defined in config');
  }

  console.log('🚀 Starting global setup...');

  // Create a browser instance for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the application to be ready
    console.log(`📡 Checking if application is ready at ${baseURL}`);
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Privacy Advisor', { timeout: 30000 });
    console.log('✅ Application is ready');

    // Optional: Create test data or perform other setup tasks
    // For example, seed test reports with fixture data

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup completed');
}

export default globalSetup;