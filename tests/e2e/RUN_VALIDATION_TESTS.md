# Timeout/Retry & Responsive Design Validation Tests

## Overview

This document provides instructions for running comprehensive E2E validation tests for:
1. **Timeout & Retry Mechanism** - 60-second timeout with 3-retry functionality
2. **Responsive Design** - Mobile (375px), Tablet (768px), Desktop (1920px)
3. **Cross-Viewport Functionality** - All interactive features across viewports

## Test Files

### 1. Timeout & Retry Validation
**File:** `/tests/e2e/tests/timeout-retry-validation.spec.ts`

**Test Scenarios:**
- ✅ Scenario 1: Normal Scan Completion (Control Test)
- ✅ Scenario 2: Timeout Detection Test (60+ seconds)
- ✅ Scenario 3: Retry Mechanism - First Retry
- ✅ Scenario 4: Multiple Retry Attempts (up to 3)
- ✅ Scenario 5: Successful Retry After Failure
- ✅ Scenario 6: Manual Timeout (User Refresh)

### 2. Responsive Design Validation
**File:** `/tests/e2e/tests/responsive-design-validation.spec.ts`

**Viewports Tested:**
- 📱 Mobile (375x667) - iPhone SE
- 📱 Tablet (768x1024) - iPad
- 🖥️ Desktop (1920x1080) - Standard Desktop

**Pages Tested:**
- Homepage
- Pricing Page
- Scan Progress Page
- Scan Results Page

### 3. Cross-Viewport Functionality
**File:** `/tests/e2e/tests/cross-viewport-functionality.spec.ts`

**Features Tested:**
- Scan submission (all viewports)
- Navigation links (all viewports)
- Wallet connection modal (all viewports)
- PRO upgrade modal (all viewports)
- Touch interactions (mobile)
- Keyboard navigation (desktop)
- Scrolling behavior (all viewports)

## Running the Tests

### Prerequisites

1. **Install Dependencies:**
   ```bash
   cd /Users/pothamsettyk/Projects/Privacy-Advisor
   pnpm install
   npx playwright install chromium
   ```

2. **Verify Stage Deployment:**
   - Ensure fixes are deployed to: `https://stage.geckoadvisor.com`
   - Verify rate limiting fix is active
   - Confirm timeout mechanism is functioning

### Run All Validation Tests

```bash
# Run all validation tests
npx playwright test tests/e2e/tests/timeout-retry-validation.spec.ts \
                    tests/e2e/tests/responsive-design-validation.spec.ts \
                    tests/e2e/tests/cross-viewport-functionality.spec.ts \
                    --project=chromium \
                    --reporter=html,list
```

### Run Individual Test Suites

#### 1. Timeout & Retry Tests Only
```bash
npx playwright test tests/e2e/tests/timeout-retry-validation.spec.ts \
  --project=chromium \
  --reporter=html,list
```

**Expected Duration:** 15-25 minutes (includes timeout tests)

#### 2. Responsive Design Tests Only
```bash
npx playwright test tests/e2e/tests/responsive-design-validation.spec.ts \
  --project=chromium \
  --reporter=html,list
```

**Expected Duration:** 5-10 minutes

#### 3. Cross-Viewport Functionality Tests Only
```bash
npx playwright test tests/e2e/tests/cross-viewport-functionality.spec.ts \
  --project=chromium \
  --reporter=html,list
```

**Expected Duration:** 8-12 minutes

### Run with Headed Browser (Visual Debugging)

```bash
npx playwright test tests/e2e/tests/timeout-retry-validation.spec.ts \
  --project=chromium \
  --headed \
  --reporter=list
```

### Run Specific Test Scenario

```bash
# Run only timeout detection test
npx playwright test tests/e2e/tests/timeout-retry-validation.spec.ts \
  --grep "Scenario 2: Timeout Detection" \
  --project=chromium
```

```bash
# Run only mobile responsiveness tests
npx playwright test tests/e2e/tests/responsive-design-validation.spec.ts \
  --grep "Mobile Viewport" \
  --project=chromium
```

## Test Execution Options

### Serial Execution (Recommended for Rate Limiting)

```bash
npx playwright test tests/e2e/tests/timeout-retry-validation.spec.ts \
  --workers=1 \
  --project=chromium
```

### Debug Mode

```bash
npx playwright test tests/e2e/tests/timeout-retry-validation.spec.ts \
  --debug \
  --project=chromium
```

### Generate Detailed Report

```bash
npx playwright test tests/e2e/tests/timeout-retry-validation.spec.ts \
                    tests/e2e/tests/responsive-design-validation.spec.ts \
                    tests/e2e/tests/cross-viewport-functionality.spec.ts \
  --project=chromium \
  --reporter=html,json,list \
  --output=test-results/validation-tests/
```

## Viewing Test Results

### HTML Report

After test execution, view the comprehensive HTML report:

```bash
npx playwright show-report
```

This opens an interactive report with:
- ✅ Pass/Fail status for each test
- 📸 Screenshots (on failure or captured during test)
- 🎥 Video recordings (on failure)
- ⏱️ Execution timings
- 📋 Detailed logs

### Screenshots Location

All screenshots are saved to:
```
/Users/pothamsettyk/Projects/Privacy-Advisor/test-results/screenshots/
```

**Timeout/Retry Screenshots:**
- `timeout-test-1-scan-started.png`
- `timeout-test-1-report-loaded.png`
- `timeout-test-2-timeout-state.png`
- `timeout-test-3-retry-count-visible.png`
- `timeout-test-4-auto-redirect-home.png`
- `timeout-test-5-success-after-retry.png`
- `timeout-test-6-final-state.png`

**Responsive Design Screenshots:**
- `mobile-375-homepage.png`
- `mobile-375-pricing.png`
- `mobile-375-scan-progress.png`
- `tablet-768-homepage.png`
- `tablet-768-pricing.png`
- `desktop-1920-homepage.png`
- `desktop-1920-pricing.png`
- `desktop-1920-scan-results.png`

**Functionality Screenshots:**
- `functionality-mobile-homepage.png`
- `functionality-tablet-scan-initiated.png`
- `functionality-desktop-wallet-modal.png`
- etc.

### JSON Report

For programmatic analysis:
```bash
cat test-results/e2e-results.json | jq
```

## Expected Test Results

### Success Criteria

#### Timeout & Retry Tests:
- ✅ Test 1: Normal scan completes in <60 seconds
- ✅ Test 2: Timeout triggers after 60 seconds (conditional)
- ✅ Test 3: Retry button visible and functional
- ✅ Test 4: Up to 3 retry attempts allowed
- ✅ Test 5: Successful retry clears error state
- ✅ Test 6: Scan continues after browser refresh

#### Responsive Design Tests:
- ✅ Mobile (375px): No horizontal scrolling
- ✅ Tablet (768px): Two-column layouts work
- ✅ Desktop (1920px): Content centered with max-width
- ✅ Touch targets: >= 44px on mobile/tablet
- ✅ Text readability: Appropriate font sizes
- ✅ Images: Scale properly across viewports

#### Cross-Viewport Functionality Tests:
- ✅ Scan submission works on all viewports
- ✅ Navigation accessible and functional
- ✅ Modals properly sized for each viewport
- ✅ Touch interactions work on mobile
- ✅ Keyboard navigation works on desktop
- ✅ No horizontal scrolling on any viewport

### Failure Scenarios

If tests fail, check:

1. **Network Issues:**
   - Stage environment accessibility
   - Rate limiting still affecting requests
   - Network timeout/connectivity

2. **UI Changes:**
   - Element selectors may need updating
   - New UI components not yet in tests
   - Different text content

3. **Performance Issues:**
   - Scans taking longer than expected
   - Backend timeout not functioning
   - Database/Redis performance

4. **Browser Compatibility:**
   - Use `--project=chromium` for consistency
   - Check browser version compatibility

## Troubleshooting

### Test Hangs or Times Out

```bash
# Increase global timeout
npx playwright test tests/e2e/tests/timeout-retry-validation.spec.ts \
  --timeout=180000 \
  --project=chromium
```

### Rate Limiting Issues

```bash
# Run with single worker and delays
npx playwright test tests/e2e/tests/timeout-retry-validation.spec.ts \
  --workers=1 \
  --fully-parallel=false \
  --project=chromium
```

### Screenshot Capture Issues

```bash
# Force screenshot capture
npx playwright test tests/e2e/tests/responsive-design-validation.spec.ts \
  --screenshot=on \
  --project=chromium
```

### Debugging Specific Scenario

```bash
# Run single test with trace
npx playwright test tests/e2e/tests/timeout-retry-validation.spec.ts \
  --grep "Scenario 2" \
  --trace=on \
  --project=chromium

# View trace
npx playwright show-trace trace.zip
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/e2e-validation.yml`:

```yaml
name: E2E Validation Tests

on:
  push:
    branches: [stage, main]
  pull_request:
    branches: [stage, main]

jobs:
  e2e-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - uses: pnpm/action-setup@v2
        with:
          version: 10.14.0

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright
        run: npx playwright install chromium --with-deps

      - name: Run Validation Tests
        run: |
          npx playwright test \
            tests/e2e/tests/timeout-retry-validation.spec.ts \
            tests/e2e/tests/responsive-design-validation.spec.ts \
            tests/e2e/tests/cross-viewport-functionality.spec.ts \
            --project=chromium \
            --reporter=html,json

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Upload Screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-screenshots
          path: test-results/screenshots/
          retention-days: 30
```

## Generating Test Report Summary

After tests complete, generate a summary:

```bash
# Extract test results
npx playwright test --reporter=json > test-summary.json

# View summary
cat test-summary.json | jq '.suites[].specs[] | {title: .title, outcome: .tests[0].results[0].status}'
```

## Contact & Support

For issues or questions about these tests:
- Review test logs in `test-results/`
- Check Playwright report: `npx playwright show-report`
- Examine screenshots in `test-results/screenshots/`

## Next Steps After Testing

1. ✅ **Review HTML Report** - Analyze pass/fail status
2. ✅ **Examine Screenshots** - Verify visual appearance
3. ✅ **Check Console Logs** - Look for errors or warnings
4. ✅ **Document Findings** - Create test report summary
5. ✅ **Fix Failures** - Address any test failures found
6. ✅ **Production Readiness** - Determine if ready for prod deployment

---

**Test Suite Version:** 1.0.0
**Last Updated:** 2025-10-16
**Target Environment:** https://stage.geckoadvisor.com
**Playwright Version:** Latest
