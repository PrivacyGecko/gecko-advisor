/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: process.env.DATABASE_URL || '',
      RUN_DB_TESTS: process.env.RUN_DB_TESTS || '',
    },
  },
});
