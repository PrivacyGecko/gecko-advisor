/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');

  try {
    // Cleanup tasks:
    // - Clean up test data
    // - Generate test reports
    // - Archive screenshots/videos if needed

    console.log('📊 Test execution completed');

    // Optional: Generate custom reports or send notifications
    if (process.env.CI) {
      console.log('📧 CI environment detected - reports will be uploaded');
    }

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here to avoid masking test failures
  }

  console.log('✅ Global teardown completed');
}

export default globalTeardown;