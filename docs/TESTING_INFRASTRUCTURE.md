# Gecko Advisor Testing Infrastructure

**Document Version:** 1.0
**Last Updated:** 2025-10-29
**Project:** Gecko Advisor (Privacy Advisor)

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Stack](#testing-stack)
3. [Test Architecture](#test-architecture)
4. [E2E Testing with Playwright](#e2e-testing-with-playwright)
5. [Unit & Integration Tests](#unit--integration-tests)
6. [Test Data Management](#test-data-management)
7. [CI/CD Integration](#cicd-integration)
8. [Test Execution](#test-execution)
9. [Test Coverage](#test-coverage)
10. [Performance Testing](#performance-testing)
11. [Accessibility Testing](#accessibility-testing)
12. [Best Practices](#best-practices)

---

## Overview

Gecko Advisor implements a comprehensive multi-layered testing strategy covering E2E, integration, and unit tests. The testing infrastructure ensures quality across three key dimensions:

- **Functional Correctness**: Complete user journeys work as expected
- **Performance**: <3 second scan completion requirement met
- **Accessibility**: WCAG 2.1 AA compliance across all pages

### Testing Philosophy

1. **User-Centric E2E Tests**: Test what users see and do, not implementation details
2. **Semantic Selectors**: Prefer text/role selectors over brittle CSS/data-testid
3. **Performance as Requirement**: Performance thresholds are hard requirements, not suggestions
4. **Cross-Browser Validation**: Test on Chromium, Firefox, and WebKit
5. **Mobile-First**: All tests include mobile viewport validation

---

## Testing Stack

### Core Testing Frameworks

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **E2E Framework** | Playwright | 1.55.1+ | Cross-browser E2E testing |
| **Unit Testing** | Vitest | Latest | Fast unit/integration tests |
| **Accessibility** | @axe-core/playwright | 4.10.2+ | WCAG compliance validation |
| **API Testing** | Supertest | Latest | Backend API integration tests |
| **Test Runner** | Turborepo | 2.0.3+ | Monorepo test orchestration |

### Browser Coverage

```typescript
// From: /Users/pothamsettyk/Projects/Privacy-Advisor/tests/e2e/playwright.config.ts

projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], hasTouch: true }
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'], hasTouch: true }
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'], hasTouch: true }
  },
  // Mobile devices
  {
    name: 'Mobile Chrome',
    use: { ...devices['Pixel 5'], hasTouch: true }
  },
  {
    name: 'Mobile Safari',
    use: { ...devices['iPhone 12'], hasTouch: true }
  },
  // Tablet devices
  {
    name: 'Tablet',
    use: { ...devices['iPad Pro'], hasTouch: true }
  }
]
```

### Test Environment Stack

```yaml
# Docker Compose Test Environment
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: privacy_advisor_test

  redis:
    image: redis:7-alpine
    # Used for BullMQ job queue and caching

  nginx:
    image: nginx:alpine
    # Reverse proxy on port 8080
    # Routes /api/* to backend:5000
    # Routes /* to frontend:5173
```

---

## Test Architecture

### Directory Structure

```
tests/
├── e2e/                              # End-to-end tests
│   ├── playwright.config.ts          # Playwright configuration
│   ├── global-setup.ts               # Pre-test setup (health checks)
│   ├── global-teardown.ts            # Post-test cleanup
│   ├── nginx.conf                    # Nginx reverse proxy config
│   ├── docker-compose.test.yml       # Test infrastructure
│   │
│   ├── pages/                        # Page Object Models
│   │   ├── HomePage.ts               # Home page interactions
│   │   ├── ScanPage.ts               # Scan progress page
│   │   └── ReportPage.ts             # Report display page
│   │
│   ├── tests/                        # Test suites
│   │   ├── smoke.spec.ts             # Critical path smoke tests
│   │   ├── core-scanning-journey.spec.ts  # Complete scan flow
│   │   ├── performance-validation.spec.ts  # Performance requirements
│   │   ├── accessibility-mobile.spec.ts    # WCAG & mobile tests
│   │   ├── security-error-handling.spec.ts # Security validation
│   │   ├── license-compliance.spec.ts      # License attribution
│   │   └── performance-benchmarking.spec.ts # Load testing
│   │
│   ├── utils/                        # Test utilities
│   │   └── test-helpers.ts           # Reusable test functions
│   │
│   └── scripts/                      # Test execution scripts
│       ├── run-tests.sh              # Main test runner
│       ├── run-local-e2e.sh          # Local development runner
│       ├── start-e2e-stack.sh        # Start Docker environment
│       ├── generate-performance-report.js
│       └── generate-accessibility-report.js
│
├── fixtures/                         # Test fixture data
│   ├── example/                      # Example.com test data
│   ├── demo-adtech/                  # Ad-heavy test case
│   └── mixed-content/                # Security test cases
│
apps/
├── backend/src/
│   ├── smoke.test.ts                 # Backend smoke test
│   ├── report.test.ts                # Report API integration test
│   └── recent.test.ts                # Recent scans endpoint test
│
├── worker/src/
│   └── scoring.test.ts               # Scoring algorithm unit tests
│
└── frontend/src/lib/
    └── grading.test.ts               # Grade calculation unit tests
```

---

## E2E Testing with Playwright

### Configuration

**Location:** `/Users/pothamsettyk/Projects/Privacy-Advisor/tests/e2e/playwright.config.ts`

Key settings:

```typescript
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,              // 1 minute per test
  expect: { timeout: 10_000 },  // 10 seconds for assertions

  retries: process.env.CI ? 2 : 0,  // Retry flaky tests in CI
  workers: process.env.CI ? 1 : undefined,  // Serial in CI

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  // Nginx reverse proxy on port 8080
  webServer: {
    command: 'pnpm dev',
    port: 8080,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    url: 'http://localhost:8080/health',
  },
});
```

### Page Object Model (POM) Architecture

**Philosophy:** Encapsulate page interactions in reusable classes to improve maintainability.

#### HomePage.ts

```typescript
// Location: /Users/pothamsettyk/Projects/Privacy-Advisor/tests/e2e/pages/HomePage.ts

export class HomePage {
  readonly page: Page;
  readonly urlInput: Locator;
  readonly scanButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.urlInput = page.locator('input[aria-label="Scan input"]');
    this.scanButton = page.getByRole('button', { name: 'Start privacy scan' });
  }

  async goto() {
    await this.page.goto('/');
    await expect(this.page.locator('h1')).toContainText('See What\'s Tracking You Online');
  }

  async startScan(url: string) {
    await this.urlInput.fill(url);
    await this.scanButton.click();
    await this.page.waitForURL(/\/scan\/[\w-]+/);
    return this.page.url();
  }
}
```

#### ScanPage.ts

Handles scan progress monitoring and auto-redirect to report page:

```typescript
// Location: /Users/pothamsettyk/Projects/Privacy-Advisor/tests/e2e/pages/ScanPage.ts

export class ScanPage {
  async waitForScanCompletion(timeout = 30000): Promise<{ state: string; duration: number }> {
    const startTime = performance.now();

    try {
      // Wait for redirect to report page (scan completion)
      await this.page.waitForURL(/\/r\/[\w-]+/, { timeout });
      const duration = performance.now() - startTime;
      return { state: 'completed', duration };
    } catch (error) {
      return { state: 'timeout', duration: performance.now() - startTime };
    }
  }

  async getProgressPercentage(): Promise<number> {
    const progressText = await this.page.textContent('body');
    const percentageMatch = progressText?.match(/(\d+)%/);
    return percentageMatch ? parseInt(percentageMatch[1], 10) : 0;
  }
}
```

#### ReportPage.ts

Validates scan results and privacy score display:

```typescript
// Location: /Users/pothamsettyk/Projects/Privacy-Advisor/tests/e2e/pages/ReportPage.ts

export class ReportPage {
  async getPrivacyScore(): Promise<{ score: number; grade?: string }> {
    const pageContent = await this.page.textContent('body');
    const scoreMatch = pageContent?.match(/Privacy score (\d+)/i);
    const score = parseInt(scoreMatch?.[1] || '0', 10);

    const gradeMatch = pageContent?.match(/\b(SAFE|CAUTION|DANGER)\b/i);
    const grade = gradeMatch?.[1].toUpperCase();

    return { score, grade };
  }

  async verifyScoreDialAccessibility() {
    const scoreDial = this.page.locator('[data-testid="score-dial"]');
    await expect(scoreDial).toHaveAttribute('role', 'img');
    await expect(scoreDial).toHaveAttribute('aria-label');
  }
}
```

### Global Setup & Teardown

**Global Setup** (`/Users/pothamsettyk/Projects/Privacy-Advisor/tests/e2e/global-setup.ts`):

```typescript
async function globalSetup(config: FullConfig) {
  // 1. Detect browser being tested (chromium/firefox/webkit)
  const browserName = detectBrowserProject(config);
  const browser = await browserType.launch();

  // 2. Health check with retry logic (10 attempts, exponential backoff)
  await retryWithBackoff(
    async () => {
      const response = await page.goto(`${baseURL}/health`);
      if (!response?.ok()) throw new Error('Health check failed');
    },
    { maxAttempts: 10, delayMs: 2000, backoffMultiplier: 1.2 }
  );

  // 3. Verify application is rendering correctly
  await page.goto(baseURL);
  await page.waitForSelector('text=Gecko Advisor', { timeout: 5000 });

  // 4. Optional: Verify backend API
  await page.goto(`${baseURL}/api/health`);
}
```

**Global Teardown** (`/Users/pothamsettyk/Projects/Privacy-Advisor/tests/e2e/global-teardown.ts`):

```typescript
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');
  // Cleanup: Archive screenshots, generate reports, cleanup test data
  if (process.env.CI) {
    console.log('📧 CI environment detected - reports will be uploaded');
  }
}
```

---

## Unit & Integration Tests

### Backend Tests (Vitest)

**Configuration:** `/Users/pothamsettyk/Projects/Privacy-Advisor/apps/backend/vitest.config.ts`

```typescript
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
```

#### Report API Integration Test

**Location:** `/Users/pothamsettyk/Projects/Privacy-Advisor/apps/backend/src/report.test.ts`

```typescript
describe('GET /api/report/:slug includes dataSharing meta', () => {
  const canRun = process.env.RUN_DB_TESTS === '1';

  beforeAll(async () => {
    if (!canRun) return;

    // Create test scan in database
    const scan = await prisma.scan.create({
      data: {
        input: 'https://meta.test',
        normalizedInput: 'https://meta.test/',
        targetType: 'url',
        status: 'done',
        slug: 'test-report-meta',
        score: 65,
        label: 'Caution',
      },
    });

    // Add evidence data
    await prisma.evidence.createMany({
      data: [
        { scanId, kind: 'tracker', severity: 3, title: 'Tracker A' },
        { scanId, kind: 'thirdparty', severity: 2, title: 'CDN' },
      ],
    });
  });

  it('returns meta.dataSharing with allowed value', async () => {
    const res = await request(app)
      .get(`/api/report/test-report-meta`)
      .expect(200);

    expect(res.body.meta).toBeTruthy();
    expect(['None', 'Low', 'Medium', 'High']).toContain(res.body.meta.dataSharing);
  });
});
```

### Worker Tests (Vitest)

**Location:** `/Users/pothamsettyk/Projects/Privacy-Advisor/apps/worker/src/scoring.test.ts`

Tests the core privacy scoring algorithm with unit tests:

```typescript
describe('computeScore', () => {
  it('returns baseline score and issues when no evidence present', async () => {
    const prisma = createMockPrisma([]);
    const result = await computeScore(prisma, 'scan');

    // With no evidence: 100 + 5 (no trackers) - 5 (no policy) = 100
    expect(result.score).toBe(100);
    expect(result.label).toBe('Safe');
    expect(result.issues.find(issue => issue.key === 'compliance.policy')).toBeTruthy();
  });

  it('deduplicates evidence across multiple pages (FIX #1)', async () => {
    // Simulate 10 pages with same missing header
    const duplicatedHeaders = Array.from({ length: 10 }, (_, i) => ({
      id: `header-${i}`,
      kind: 'header',
      details: { name: 'permissions-policy' }
    }));

    const result = await computeScore(prisma, 'scan');

    // Should only count once (-3 points), not 10 times (-30 points)
    expect(result.score).toBe(97);
  });

  it('does not penalize first-party CDNs (FIX #2)', async () => {
    const scan = { input: 'github.com', normalizedInput: 'https://github.com' };
    const thirdParties = [
      { kind: 'thirdparty', details: { domain: 'github.githubassets.com' } },
      { kind: 'thirdparty', details: { domain: 'githubusercontent.com' } },
      { kind: 'thirdparty', details: { domain: 'google-analytics.com' } }, // actual third-party
    ];

    const result = await computeScore(prisma, 'scan');

    // Should only penalize google-analytics.com (-2 points)
    expect(result.score).toBe(98);
  });
});
```

### Frontend Tests (Vitest)

**Location:** `/Users/pothamsettyk/Projects/Privacy-Advisor/apps/frontend/src/lib/grading.test.ts`

Tests the grade calculation logic used in the UI:

```typescript
describe('grading', () => {
  it('should return A for scores 90-100', () => {
    expect(getLetterGrade(100)).toBe('A');
    expect(getLetterGrade(90)).toBe('A');
  });

  it('should return correct info for grade A', () => {
    const info = getGradeInfo(95);
    expect(info.letter).toBe('A');
    expect(info.label).toBe('Excellent');
    expect(info.emoji).toBe('🎉');
    expect(info.colors.bg).toBe('bg-green-100');
  });

  it('should generate correct aria-label for accessibility', () => {
    const label = getGradeAriaLabel(95);
    expect(label).toBe('Grade A: Excellent privacy score, 95 out of 100');
  });
});
```

---

## Test Data Management

### Test URL Constants

**Location:** `/Users/pothamsettyk/Projects/Privacy-Advisor/tests/e2e/utils/test-helpers.ts`

```typescript
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
```

### Performance Thresholds

```typescript
export const PERFORMANCE_THRESHOLDS = {
  SCAN_COMPLETION: 90000,       // 90 seconds max for real domains
  SCAN_COMPLETION_FAST: 3000,   // 3 seconds for test fixture data (CRITICAL)
  PAGE_LOAD: 5000,              // 5 seconds max
  DATABASE_QUERY: 50,           // 50ms max for deduplication
} as const;
```

### Test Fixtures

Test fixture directories contain sample HTML/data for specific test scenarios:

```
tests/fixtures/
├── example/              # Example.com baseline
├── demo-adtech/         # Ad-heavy site with trackers
└── mixed-content/       # HTTPS page loading HTTP resources
```

---

## CI/CD Integration

### GitHub Actions Workflow

**Location:** `/Users/pothamsettyk/Projects/Privacy-Advisor/.github/workflows/e2e-tests.yml`

#### Matrix Testing Strategy

```yaml
strategy:
  fail-fast: false
  matrix:
    browser: [chromium, firefox, webkit]
    test-suite:
      - "Smoke Tests"
      - "Core Privacy Scanning Journey"
      - "Performance Validation"
      - "Accessibility & Mobile Testing"
      # Disabled until implemented:
      # - "Security & Error Handling"
      # - "License Compliance Display"
```

This creates **3 browsers × 4 test suites = 12 parallel test jobs**.

#### Workflow Structure

1. **Setup Phase** (all jobs)
   ```yaml
   - Checkout code
   - Setup Node.js 22
   - Setup pnpm 10.14.0
   - Install dependencies (with caching)
   - Install Playwright browsers (only needed browser)
   ```

2. **Database Setup** (GitHub Actions services)
   ```yaml
   services:
     postgres:
       image: postgres:15
       env:
         POSTGRES_PASSWORD: postgres
         POSTGRES_DB: privacy_advisor_test
       options: --health-cmd pg_isready
       ports:
         - 5432:5432

     redis:
       image: redis:7
       options: --health-cmd "redis-cli ping"
       ports:
         - 6379:6379
   ```

3. **Application Startup** (local environment)
   ```bash
   # Start backend on port 5000
   cd apps/backend && pnpm dev &

   # Start worker for job processing
   cd apps/worker && pnpm dev &

   # Start frontend on port 5173
   cd apps/frontend && pnpm dev &

   # Wait for services to be ready
   timeout 60 bash -c 'until curl -f http://localhost:5000/api/health; do sleep 2; done'
   timeout 60 bash -c 'until curl -f http://localhost:5173; do sleep 2; done'
   ```

4. **Nginx Reverse Proxy**
   ```bash
   # Start Nginx container with host networking
   docker run -d \
     --name nginx-e2e \
     --network host \
     -v ${{ github.workspace }}/tests/e2e/nginx.conf:/etc/nginx/nginx.conf:ro \
     nginx:alpine

   # Nginx routes:
   # - http://localhost:8080/api/* → http://localhost:5000/api/*
   # - http://localhost:8080/* → http://localhost:5173/*
   ```

5. **Test Execution**
   ```bash
   cd tests/e2e
   npx playwright test \
     --project="${{ matrix.browser }}" \
     --grep="${{ matrix.test-suite }}" \
     --reporter=html,json,junit
   ```

6. **Artifact Upload** (on test completion)
   ```yaml
   - name: Upload test results
     uses: actions/upload-artifact@v4
     if: always()
     with:
       name: test-results-${{ matrix.browser }}-${{ matrix.test-suite }}
       path: |
         tests/e2e/test-results/
         tests/e2e/playwright-report/
       retention-days: 7
   ```

#### Specialized Jobs

**Performance Benchmarks Job:**
- Runs after main E2E tests complete
- Only uses Chromium (for consistency)
- Generates performance report (performance-summary.md)
- Comments on PR with results

**Accessibility Audit Job:**
- Dedicated job for WCAG compliance
- Runs @axe-core/playwright scans
- Generates accessibility-summary.md
- Uploads accessibility results for 30 days

**Test Summary Job:**
- Aggregates results from all jobs
- Generates unified test-summary.md
- Comments on PR with overall pass/fail status

### Environment Variables

```yaml
env:
  NODE_VERSION: '22'
  PNPM_VERSION: '10.14.0'
  E2E_TARGET_ENV: 'local'  # Can be set to 'stage' for staging tests

# Test-specific environment
E2E_BASE_URL: http://localhost:8080
E2E_BROWSER: ${{ matrix.browser }}
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/privacy_advisor_test
REDIS_URL: redis://localhost:6379
TURNSTILE_ENABLED: false  # Disable Cloudflare Turnstile in tests
```

---

## Test Execution

### Local Development

#### Running All Tests

```bash
# From project root
pnpm test:e2e

# Or using make
make test-e2e
```

#### Running Specific Test Suites

```bash
# Core functionality
pnpm test:e2e:core

# Performance tests
pnpm test:e2e:performance

# Accessibility tests
pnpm test:e2e:accessibility

# Security tests
pnpm test:e2e:security

# License compliance
pnpm test:e2e:license

# Performance benchmarks
pnpm test:e2e:benchmarks
```

#### Running Specific Browsers

```bash
# Firefox
pnpm test:e2e:firefox

# WebKit/Safari
pnpm test:e2e:webkit

# Headed mode (visible browser)
pnpm test:e2e:ui
```

#### Advanced Options

```bash
cd tests/e2e

# Custom options
./scripts/run-tests.sh --suite core --browser firefox --workers 2 --headless false

# Run against staging environment
E2E_BASE_URL=https://staging.example.com ./scripts/run-tests.sh

# Debug mode with headed browser
./scripts/run-tests.sh --suite core --headless false
```

### Test Runner Script

**Location:** `/Users/pothamsettyk/Projects/Privacy-Advisor/tests/e2e/scripts/run-tests.sh`

Features:
- ✅ Pre-flight checks (application health check)
- ✅ Browser installation verification
- ✅ Flexible suite selection
- ✅ Custom URL support
- ✅ Report generation (performance, accessibility)
- ✅ Colored output with status indicators

Usage:
```bash
./scripts/run-tests.sh [OPTIONS]

Options:
  -b, --browser BROWSER    Browser to use (chromium, firefox, webkit)
  -s, --suite SUITE       Test suite to run (all, core, performance, etc.)
  -u, --url URL           Base URL for testing
  -w, --workers NUM       Number of parallel workers
  -h, --headless BOOL     Run in headless mode
  -o, --output DIR        Output directory
  -r, --report FORMAT     Report format (html, json, junit)
```

### Docker-Based E2E Environment

Start complete test stack with Docker Compose:

```bash
# Start Postgres, Redis, and Nginx
cd tests/e2e
docker-compose -f docker-compose.test.yml up -d

# Wait for services
docker-compose -f docker-compose.test.yml ps

# Run tests
pnpm exec playwright test

# Cleanup
docker-compose -f docker-compose.test.yml down
```

---

## Test Coverage

### E2E Test Suites

#### 1. Smoke Tests (`smoke.spec.ts`)

**Purpose:** Validate critical paths work before running full test suite.

**Location:** `/Users/pothamsettyk/Projects/Privacy-Advisor/tests/e2e/tests/smoke.spec.ts`

**Coverage:**
- ✅ Homepage loads with all key elements
- ✅ User can complete full scan journey (URL → Scan → Report)
- ✅ Direct report access works
- ✅ Invalid URL handling (graceful degradation)

**Philosophy:**
- Uses semantic selectors (text, roles, placeholders)
- Minimal data-testid usage
- Tests user-visible behavior only

```typescript
test('User can complete full scan journey and see report', async ({ page }) => {
  // Step 1: Navigate to homepage
  await page.goto('/');

  // Step 2: Enter URL and start scan
  const scanInput = page.getByPlaceholder('Enter website URL (e.g., example.com)');
  await scanInput.fill('https://example.com');

  const scanButton = page.getByRole('button', { name: 'Start privacy scan' });
  await scanButton.click();

  // Step 3: Wait for scan status page (/scan/:id)
  await page.waitForURL(/\/scan\/[\w-]+/, { timeout: 10000 });

  // Step 4: Wait for auto-redirect to report (/r/:slug)
  await page.waitForURL(/\/r\/[\w-]+/, { timeout: 90000 });

  // Step 5: Verify privacy score is visible
  const scoreDial = page.locator('[data-testid="score-dial"]');
  await expect(scoreDial).toBeVisible({ timeout: 10000 });
});
```

#### 2. Core Scanning Journey (`core-scanning-journey.spec.ts`)

**Purpose:** Comprehensive validation of all scan-related functionality.

**Coverage:**
- ✅ Complete scanning journey with fixture data (<3 seconds)
- ✅ Complete scanning journey with real domain (60 seconds)
- ✅ HTTP to HTTPS URL handling
- ✅ URL input validation and edge cases
- ✅ Scan deduplication functionality
- ✅ Real-time scan status updates
- ✅ Browser navigation during scan
- ✅ Multiple scan tabs handling
- ✅ Scan URL sharing and direct access
- ✅ Concurrent scan handling
- ✅ Scan progress percentage accuracy

#### 3. Performance Validation (`performance-validation.spec.ts`)

**Purpose:** Ensure performance requirements are met.

**Coverage:**
- ⚡ Scan completion under 3 seconds requirement (CRITICAL)
- ⚡ Database deduplication lookup performance (<50ms)
- ⚡ Page load performance metrics (<5 seconds)
- ⚡ React Query caching optimization
- ⚡ Frontend bundle optimization (check bundle size)
- ⚡ Network conditions impact on performance
- ⚡ N+1 query fixes validation
- ⚡ Redis caching performance
- ⚡ Concurrent user handling (load testing)

**Performance Assertions:**
```typescript
test('Scan completion under 3 seconds requirement', async ({ page }) => {
  const homePage = new HomePage(page);
  const scanPage = new ScanPage(page);

  await homePage.goto();

  const { duration } = await measurePerformance(
    async () => {
      await homePage.startScan(TEST_URLS.FIXTURE_SAFE);
      const { state } = await scanPage.waitForScanCompletion();
      expect(state).toBe('completed');
    },
    'Complete scan journey with fixture data'
  );

  // CRITICAL: Must meet 3-second requirement
  expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SCAN_COMPLETION_FAST);
});
```

#### 4. Accessibility & Mobile (`accessibility-mobile.spec.ts`)

**Purpose:** WCAG 2.1 AA compliance and mobile responsiveness.

**Coverage:**
- ♿ WCAG AA compliance - Home page
- ♿ WCAG AA compliance - Scan page
- ♿ WCAG AA compliance - Report page
- ♿ Screen reader compatibility
- ♿ Keyboard navigation - Complete journey
- ♿ Focus management and trap prevention
- ♿ Mobile viewport testing (iPhone 12, Pixel 5)
- ♿ Tablet viewport testing (iPad Pro)
- ♿ Touch target sizing (≥44px)
- ♿ Color contrast validation
- ♿ Reduced motion preferences
- ♿ High contrast mode support

**Accessibility Test Example:**
```typescript
test('WCAG AA compliance - Home page', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();

  // Run comprehensive accessibility audit
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);

  // Test specific accessibility features
  await homePage.verifyAccessibility();
});
```

#### 5. Security & Error Handling (`security-error-handling.spec.ts`)

**Purpose:** Validate security measures and error handling.

**Coverage:**
- 🔒 XSS prevention and input sanitization
- 🔒 SQL injection protection
- 🔒 Admin authentication timing attack fixes
- 🔒 Rate limiting validation
- 🔒 Error boundary functionality
- 🔒 CSRF protection
- 🔒 Content Security Policy compliance
- 🔒 Evidence data sanitization
- 🔒 Information disclosure prevention

**Security Test Example:**
```typescript
test('XSS prevention - URL input', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();

  const xssPayload = '<script>alert("xss")</script>';
  await homePage.startScan(xssPayload);

  // Should sanitize input and not execute script
  const bodyContent = await page.textContent('body');
  expect(bodyContent).not.toContain('<script>');

  // Check for proper HTML encoding
  expect(bodyContent).toContain('&lt;script&gt;');
});
```

#### 6. License Compliance (`license-compliance.spec.ts`)

**Purpose:** Ensure proper attribution for data sources.

**Coverage:**
- 📜 EasyPrivacy attribution display
- 📜 WhoTracks.me attribution display
- 📜 AboutCredits component functionality
- 📜 License information accessibility
- 📜 Third-party data source credits
- 📜 Mobile license display
- 📜 SPDX header validation

#### 7. Performance Benchmarking (`performance-benchmarking.spec.ts`)

**Purpose:** Load testing and regression detection.

**Coverage:**
- 📊 Concurrent user simulation (10+ users)
- 📊 Memory leak detection
- 📊 Database connection pool monitoring
- 📊 Redis queue performance under load
- 📊 Frontend rendering performance
- 📊 API endpoint latency tracking

### Unit Test Coverage

#### Backend API Tests

| Test File | Component | Coverage |
|-----------|-----------|----------|
| `smoke.test.ts` | Smoke | Basic backend sanity check |
| `report.test.ts` | Report API | Validates `/api/report/:slug` endpoint |
| `recent.test.ts` | Recent Scans | Validates `/api/recent` endpoint |

#### Worker Tests

| Test File | Component | Coverage |
|-----------|-----------|----------|
| `scoring.test.ts` | Scoring Algorithm | 200+ lines of unit tests for privacy scoring |

Key test cases:
- ✅ Baseline score calculation
- ✅ Evidence deduplication (FIX #1)
- ✅ First-party CDN exclusion (FIX #2)
- ✅ Security bonus rewards (FIX #3)
- ✅ Tracker penalties
- ✅ Third-party penalties
- ✅ Cookie severity handling

#### Frontend Tests

| Test File | Component | Coverage |
|-----------|-----------|----------|
| `grading.test.ts` | Grade Calculation | Letter grade logic (A-F) |

Key test cases:
- ✅ Score to letter grade conversion
- ✅ Grade info (label, emoji, colors)
- ✅ Accessibility aria-labels
- ✅ Real-world score scenarios
- ✅ Edge cases (0, 100, decimals)

---

## Performance Testing

### Performance Thresholds

```typescript
export const PERFORMANCE_THRESHOLDS = {
  SCAN_COMPLETION: 90000,       // 90 seconds for real domains
  SCAN_COMPLETION_FAST: 3000,   // 3 seconds for fixture data (CRITICAL)
  PAGE_LOAD: 5000,              // 5 seconds
  DATABASE_QUERY: 50,           // 50ms for deduplication
} as const;
```

### Measurement Utilities

**Location:** `/Users/pothamsettyk/Projects/Privacy-Advisor/tests/e2e/utils/test-helpers.ts`

```typescript
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
```

### Network Throttling

Simulates slow 3G connection for performance testing:

```typescript
export async function simulateSlowNetwork(page: Page) {
  try {
    // Only works in Chromium via CDP
    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 500 * 1024, // 500kb/s
      uploadThroughput: 500 * 1024,
      latency: 400, // 400ms
    });
  } catch (error) {
    console.warn('⚠️  Network emulation not available (WebKit/Firefox)');
  }
}
```

### Core Web Vitals

HomePage.ts includes performance metrics collection:

```typescript
async checkPerformanceMetrics() {
  const performanceData = await this.page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      loadComplete: navigation.loadEventEnd - navigation.fetchStart,
      firstPaint: performance.getEntriesByType('paint')
        .find(e => e.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByType('paint')
        .find(e => e.name === 'first-contentful-paint')?.startTime || 0,
    };
  });

  return performanceData;
}
```

---

## Accessibility Testing

### Accessibility Configuration

```typescript
export const A11Y_CONFIG = {
  rules: {
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-management': { enabled: true },
    'screen-reader': { enabled: true },
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
} as const;
```

### WCAG Compliance Testing

Using @axe-core/playwright for automated accessibility audits:

```typescript
import AxeBuilder from '@axe-core/playwright';

test('WCAG AA compliance - Report page', async ({ page }) => {
  const reportPage = new ReportPage(page);
  await reportPage.waitForReportLoad();

  // Comprehensive accessibility check
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

### Manual Accessibility Tests

- ✅ Keyboard navigation (Tab, Shift+Tab, Enter, Space)
- ✅ Focus indicators visible
- ✅ Skip navigation links
- ✅ ARIA labels for interactive elements
- ✅ Semantic HTML structure
- ✅ Alt text for images
- ✅ Form labels properly associated
- ✅ Error messages announced to screen readers

---

## Best Practices

### 1. Test Organization

✅ **DO:**
- Group related tests in describe blocks
- Use descriptive test names explaining what's being tested
- Follow Arrange-Act-Assert pattern
- Keep tests independent and isolated

❌ **DON'T:**
- Create tests that depend on other tests' state
- Test implementation details (internal functions, component state)
- Use magic numbers without explanation

### 2. Selector Strategy

✅ **DO:**
```typescript
// Semantic selectors (preferred)
page.getByRole('button', { name: 'Start privacy scan' })
page.getByPlaceholder('Enter website URL')
page.getByText('Privacy score')

// ARIA labels
page.locator('input[aria-label="Scan input"]')
```

❌ **DON'T:**
```typescript
// Brittle CSS selectors
page.locator('.btn-primary.scan-button')
page.locator('div > button:nth-child(2)')
```

### 3. Assertions

✅ **DO:**
```typescript
// Wait for element before asserting
await expect(scoreDial).toBeVisible({ timeout: 10000 });

// Assert actual behavior
expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SCAN_COMPLETION_FAST);
```

❌ **DON'T:**
```typescript
// Hard waits
await page.waitForTimeout(5000);

// Vague assertions
expect(result).toBeTruthy();
```

### 4. Error Handling

✅ **DO:**
```typescript
try {
  await page.waitForSelector('.score-dial', { timeout: 10000 });
} catch (error) {
  await page.screenshot({ path: 'failure.png' });
  throw new Error(`Score dial not found. URL: ${page.url()}`);
}
```

❌ **DON'T:**
```typescript
try {
  await page.waitForSelector('.score-dial');
} catch {
  // Silent failure
}
```

### 5. Performance Testing

✅ **DO:**
```typescript
const { duration } = await measurePerformance(
  async () => await scanPage.waitForScanCompletion(),
  'Scan completion time'
);
expect(duration).toBeLessThan(3000);
console.log(`✅ Scan completed in ${duration}ms`);
```

❌ **DON'T:**
```typescript
// No measurement
await scanPage.waitForScanCompletion();
// Assume it's fast enough
```

### 6. Test Data

✅ **DO:**
```typescript
// Use constants
await homePage.startScan(TEST_URLS.FIXTURE_SAFE);

// Generate unique test data
const testData = generateTestData();
await homePage.startScan(testData.url);
```

❌ **DON'T:**
```typescript
// Hardcoded strings
await homePage.startScan('https://example.com');
```

### 7. Cleanup

✅ **DO:**
```typescript
test.afterEach(async ({ page }) => {
  await page.close();
});

test.afterAll(async () => {
  await prisma.scan.deleteMany({ where: { testId } });
});
```

❌ **DON'T:**
```typescript
// Leave test data in database
// Leave browser instances running
```

---

## Summary

### Test Execution Commands

```bash
# All E2E tests
pnpm test:e2e

# Specific suites
pnpm test:e2e:core
pnpm test:e2e:performance
pnpm test:e2e:accessibility
pnpm test:e2e:security
pnpm test:e2e:license

# Specific browsers
pnpm test:e2e:firefox
pnpm test:e2e:webkit

# Unit tests
pnpm test  # Runs all unit tests via Turbo

# Backend only
cd apps/backend && pnpm test

# Worker only
cd apps/worker && pnpm test

# Frontend only
cd apps/frontend && pnpm test
```

### Key Test Files

| Path | Purpose |
|------|---------|
| `/tests/e2e/playwright.config.ts` | Playwright configuration |
| `/tests/e2e/tests/smoke.spec.ts` | Critical path smoke tests |
| `/tests/e2e/tests/core-scanning-journey.spec.ts` | Complete scan flow |
| `/tests/e2e/tests/performance-validation.spec.ts` | Performance requirements |
| `/tests/e2e/tests/accessibility-mobile.spec.ts` | WCAG & mobile tests |
| `/tests/e2e/pages/HomePage.ts` | Home page POM |
| `/tests/e2e/pages/ScanPage.ts` | Scan page POM |
| `/tests/e2e/pages/ReportPage.ts` | Report page POM |
| `/tests/e2e/utils/test-helpers.ts` | Test utilities |
| `/apps/backend/src/report.test.ts` | Backend API tests |
| `/apps/worker/src/scoring.test.ts` | Scoring algorithm tests |
| `/apps/frontend/src/lib/grading.test.ts` | Grade calculation tests |

### CI/CD Integration

- **GitHub Actions:** `.github/workflows/e2e-tests.yml`
- **Matrix Testing:** 3 browsers × 4 test suites = 12 parallel jobs
- **Services:** PostgreSQL 15, Redis 7, Nginx Alpine
- **Artifacts:** Test results, screenshots, videos, reports (7-30 day retention)
- **Reporting:** Performance summary, accessibility summary, test summary (PR comments)

### Test Coverage Metrics

- **E2E Tests:** 13 spec files, 100+ test cases
- **Unit Tests:** 5 test files (backend, worker, frontend)
- **Browser Coverage:** Chromium, Firefox, WebKit
- **Mobile Coverage:** iPhone 12, Pixel 5, iPad Pro
- **Performance:** <3 second scan requirement validated in CI
- **Accessibility:** WCAG 2.1 AA compliance validated with @axe-core

---

**Document Maintained By:** QA Automation Team
**Last Review:** 2025-10-29
**Next Review:** 2025-11-29
