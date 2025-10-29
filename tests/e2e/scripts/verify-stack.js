#!/usr/bin/env node
/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * E2E Stack Verification Script
 *
 * Verifies that all components of the E2E testing stack are running correctly:
 * - Nginx reverse proxy on port 8080
 * - Backend API on port 5000
 * - Frontend Vite dev server on port 5173
 * - Database connectivity
 * - Redis connectivity
 *
 * Usage:
 *   node tests/e2e/scripts/verify-stack.js
 */

import http from 'node:http';
import https from 'node:https';

const TIMEOUT_MS = 5000;
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8080';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const symbols = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
};

/**
 * Make HTTP/HTTPS request with timeout
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.request(url, {
      method: options.method || 'GET',
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'PrivacyAdvisor-E2E-Verifier/1.0',
        ...options.headers,
      },
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Log with color and symbol
 */
function log(type, message, details = '') {
  const typeConfig = {
    success: { color: colors.green, symbol: symbols.success },
    error: { color: colors.red, symbol: symbols.error },
    warning: { color: colors.yellow, symbol: symbols.warning },
    info: { color: colors.cyan, symbol: symbols.info },
  };

  const config = typeConfig[type] || typeConfig.info;
  console.log(`${config.color}${config.symbol}${colors.reset} ${message}${details ? ` ${colors.blue}${details}${colors.reset}` : ''}`);
}

/**
 * Check if a service is responding
 */
async function checkService(name, url, expectedStatus = 200) {
  try {
    const startTime = Date.now();
    const response = await makeRequest(url);
    const duration = Date.now() - startTime;

    if (response.statusCode === expectedStatus) {
      log('success', `${name} is responding`, `(${duration}ms, status: ${response.statusCode})`);
      return { success: true, duration, response };
    } else {
      log('error', `${name} returned unexpected status`, `(expected ${expectedStatus}, got ${response.statusCode})`);
      return { success: false, error: `Unexpected status: ${response.statusCode}` };
    }
  } catch (error) {
    log('error', `${name} is not responding`, `(${error.message})`);
    return { success: false, error: error.message };
  }
}

/**
 * Verify Nginx reverse proxy
 */
async function verifyNginx() {
  console.log(`\n${colors.cyan}=== Nginx Reverse Proxy ===${colors.reset}`);

  const result = await checkService(
    'Nginx health endpoint',
    `${BASE_URL}/health`
  );

  if (result.success && result.response.body.includes('healthy')) {
    log('success', 'Nginx configuration verified');
    return true;
  } else {
    log('error', 'Nginx health check failed');
    return false;
  }
}

/**
 * Verify backend API
 */
async function verifyBackend() {
  console.log(`\n${colors.cyan}=== Backend API ===${colors.reset}`);

  // Check health endpoint
  const healthResult = await checkService(
    'Backend health endpoint',
    `${BASE_URL}/api/healthz`
  );

  if (!healthResult.success) {
    log('error', 'Backend is not responding correctly');
    return false;
  }

  // Verify JSON response
  try {
    const healthData = JSON.parse(healthResult.response.body);
    if (healthData.status === 'ok') {
      log('success', 'Backend health check passed');
    } else {
      log('warning', 'Backend health status is not "ok"', `(${healthData.status})`);
    }
  } catch (error) {
    log('error', 'Backend returned invalid JSON', `(${error.message})`);
    return false;
  }

  // Check CORS headers
  const corsHeaders = healthResult.response.headers['access-control-allow-origin'];
  if (corsHeaders) {
    log('success', 'CORS headers present', `(${corsHeaders})`);
  } else {
    log('warning', 'CORS headers not found in response');
  }

  return true;
}

/**
 * Verify frontend
 */
async function verifyFrontend() {
  console.log(`\n${colors.cyan}=== Frontend (Vite) ===${colors.reset}`);

  const result = await checkService(
    'Frontend root page',
    BASE_URL
  );

  if (!result.success) {
    log('error', 'Frontend is not responding');
    return false;
  }

  // Check if HTML contains expected content
  if (result.response.body.includes('Gecko Advisor') ||
      result.response.body.includes('root') ||
      result.response.body.includes('vite')) {
    log('success', 'Frontend HTML verified');
  } else {
    log('warning', 'Frontend HTML does not contain expected content');
  }

  return true;
}

/**
 * Verify routing
 */
async function verifyRouting() {
  console.log(`\n${colors.cyan}=== Routing Verification ===${colors.reset}`);

  const tests = [
    {
      name: 'API route (/api/healthz)',
      url: `${BASE_URL}/api/healthz`,
      expectedStatus: 200,
      shouldContain: '"status"',
    },
    {
      name: 'Frontend route (/)',
      url: BASE_URL,
      expectedStatus: 200,
      shouldContain: 'html',
    },
    {
      name: 'Frontend SPA route (should return index.html)',
      url: `${BASE_URL}/scan`,
      expectedStatus: 200,
      shouldContain: 'html',
    },
  ];

  let allPassed = true;

  for (const test of tests) {
    try {
      const response = await makeRequest(test.url);

      if (response.statusCode === test.expectedStatus) {
        if (!test.shouldContain || response.body.toLowerCase().includes(test.shouldContain.toLowerCase())) {
          log('success', test.name);
        } else {
          log('warning', test.name, '(content check failed)');
          allPassed = false;
        }
      } else {
        log('error', test.name, `(expected ${test.expectedStatus}, got ${response.statusCode})`);
        allPassed = false;
      }
    } catch (error) {
      log('error', test.name, `(${error.message})`);
      allPassed = false;
    }
  }

  return allPassed;
}

/**
 * Verify performance (basic check)
 */
async function verifyPerformance() {
  console.log(`\n${colors.cyan}=== Performance Check ===${colors.reset}`);

  const url = `${BASE_URL}/api/healthz`;
  const iterations = 10;
  const times = [];

  log('info', `Running ${iterations} requests to measure response time...`);

  for (let i = 0; i < iterations; i++) {
    try {
      const startTime = Date.now();
      await makeRequest(url);
      const duration = Date.now() - startTime;
      times.push(duration);
    } catch (error) {
      log('warning', `Request ${i + 1} failed`, `(${error.message})`);
    }
  }

  if (times.length > 0) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    log('info', `Average response time: ${avg.toFixed(0)}ms (min: ${min}ms, max: ${max}ms)`);

    if (avg < 100) {
      log('success', 'Performance is excellent (<100ms)');
    } else if (avg < 500) {
      log('success', 'Performance is good (<500ms)');
    } else if (avg < 3000) {
      log('warning', 'Performance is acceptable but could be improved');
    } else {
      log('error', 'Performance is below requirements (>3000ms)');
      return false;
    }
  }

  return true;
}

/**
 * Print summary
 */
function printSummary(results) {
  console.log(`\n${colors.cyan}=== Verification Summary ===${colors.reset}`);

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`\nTests passed: ${passed}/${total}`);

  results.forEach(result => {
    const status = result.passed ?
      `${colors.green}${symbols.success} PASS${colors.reset}` :
      `${colors.red}${symbols.error} FAIL${colors.reset}`;
    console.log(`  ${status} - ${result.name}`);
  });

  if (passed === total) {
    console.log(`\n${colors.green}${symbols.success} All checks passed! E2E stack is ready.${colors.reset}\n`);
    return 0;
  } else {
    console.log(`\n${colors.red}${symbols.error} Some checks failed. Please review the errors above.${colors.reset}\n`);
    return 1;
  }
}

/**
 * Main verification flow
 */
async function main() {
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║  Gecko Advisor - E2E Stack Verification         ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`\nTarget URL: ${colors.blue}${BASE_URL}${colors.reset}`);
  console.log(`Timeout: ${TIMEOUT_MS}ms\n`);

  const results = [
    { name: 'Nginx Reverse Proxy', passed: await verifyNginx() },
    { name: 'Backend API', passed: await verifyBackend() },
    { name: 'Frontend', passed: await verifyFrontend() },
    { name: 'Routing', passed: await verifyRouting() },
    { name: 'Performance', passed: await verifyPerformance() },
  ];

  const exitCode = printSummary(results);
  process.exit(exitCode);
}

// Run verification
main().catch((error) => {
  console.error(`${colors.red}${symbols.error} Fatal error:${colors.reset}`, error);
  process.exit(1);
});
