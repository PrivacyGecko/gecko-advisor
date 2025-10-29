# Gecko Advisor E2E Testing Suite

Comprehensive end-to-end testing suite for the Gecko Advisor application, validating all critical user flows, performance requirements, accessibility compliance, and security measures.

## Overview

This E2E testing suite provides comprehensive validation of:

- **Core Privacy Scanning Journey**: Complete user flows from URL input to report viewing
- **Performance Validation**: <3 second scan completion, database optimizations, frontend caching
- **Accessibility & Mobile**: WCAG AA compliance, mobile responsiveness, keyboard navigation
- **Security & Error Handling**: Input sanitization, XSS prevention, timing attack fixes
- **License Compliance**: Proper attribution display for EasyPrivacy and WhoTracks.me
- **Performance Benchmarking**: Load testing, memory monitoring, regression detection

## Quick Start

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install

# Start the application
make dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
./tests/e2e/scripts/run-tests.sh --suite core
./tests/e2e/scripts/run-tests.sh --suite performance
./tests/e2e/scripts/run-tests.sh --suite accessibility
./tests/e2e/scripts/run-tests.sh --suite security
./tests/e2e/scripts/run-tests.sh --suite license

# Run with specific browser
./tests/e2e/scripts/run-tests.sh --browser firefox
./tests/e2e/scripts/run-tests.sh --browser webkit

# Run with custom options
./tests/e2e/scripts/run-tests.sh --suite performance --workers 2 --headless false
```

## Test Suites

### Core Scanning Journey (`core-scanning-journey.spec.ts`)

Tests the fundamental user experience:

- ✅ Home page → URL input → Scan → Report flow
- ✅ Fixture data testing (fast) vs real domain testing
- ✅ URL validation and edge cases (HTTP/HTTPS, subdomains, ports)
- ✅ Scan deduplication functionality
- ✅ Real-time progress updates
- ✅ Browser navigation during scans
- ✅ Multiple concurrent scans
- ✅ Direct scan URL access

**Key Requirements Validated:**
- Complete scan journey works end-to-end
- Deduplication prevents duplicate work
- Progress tracking is accurate
- All URL formats are handled correctly

### Performance Validation (`performance-validation.spec.ts`)

Validates critical performance requirements:

- ⚡ **<3 second scan completion** (CRITICAL)
- ⚡ Database deduplication lookup <50ms
- ⚡ Page load times <5 seconds
- ⚡ React Query caching effectiveness
- ⚡ Frontend bundle optimization
- ⚡ Network conditions impact
- ⚡ N+1 query fixes validation
- ⚡ Redis caching performance
- ⚡ Concurrent user handling

**Performance Thresholds:**
- Scan completion: 3000ms
- Page load: 5000ms
- Database queries: 50ms
- API responses: 1000ms

### Accessibility & Mobile (`accessibility-mobile.spec.ts`)

Ensures WCAG AA compliance and mobile-first design:

- ♿ **WCAG 2.1 AA compliance** across all pages
- ♿ Screen reader compatibility (ARIA, semantic HTML)
- ♿ Keyboard navigation and focus management
- ♿ Mobile responsiveness (iPhone, Android, tablet)
- ♿ Touch target sizing (44px minimum)
- ♿ High contrast mode support
- ♿ Reduced motion preferences
- ♿ Color contrast validation

**Accessibility Standards:**
- All interactive elements keyboard accessible
- Proper ARIA labels and roles
- Color contrast ratio 4.5:1 (AA standard)
- Touch targets ≥44px on mobile
- Screen reader announcements for dynamic content

### Security & Error Handling (`security-error-handling.spec.ts`)

Validates security measures and robust error handling:

- 🔒 XSS prevention and input sanitization
- 🔒 SQL injection protection
- 🔒 Admin authentication timing attack fixes
- 🔒 Rate limiting validation
- 🔒 Error boundary functionality
- 🔒 CSRF protection
- 🔒 Content Security Policy compliance
- 🔒 Evidence data sanitization
- 🔒 Information disclosure prevention

**Security Validations:**
- All user inputs properly sanitized
- No script execution from user input
- Consistent response times for auth endpoints
- Rate limiting blocks rapid requests
- Error messages don't expose internal details

### License Compliance (`license-compliance.spec.ts`)

Ensures proper attribution and license compliance:

- 📜 EasyPrivacy attribution display
- 📜 WhoTracks.me attribution display
- 📜 AboutCredits component functionality
- 📜 License information accessibility
- 📜 Third-party data source credits
- 📜 Mobile license display
- 📜 SPDX header validation

**Compliance Requirements:**
- Visible attribution for all data sources
- Clickable links to license information
- Mobile-friendly attribution display
- Proper SPDX license identifiers

### Performance Benchmarking (`performance-benchmarking.spec.ts`)

Advanced performance monitoring and benchmarking:

- 📊 Comprehensive baseline measurement
- 📊 Load testing simulation (5 concurrent users)
- 📊 Memory usage monitoring and leak detection
- 📊 Network resource optimization analysis
- 📊 Database performance monitoring
- 📊 Real-world user behavior simulation
- 📊 Performance regression detection

**Benchmarking Metrics:**
- Memory growth <50% over multiple scans
- Network payload <5MB total
- Database deduplication >70% faster
- Load test success rate >80%

## Configuration

### Environment Variables

```bash
E2E_BASE_URL=http://localhost:8080  # Application URL
CI=true                             # CI environment flag
NODE_ENV=test                       # Test environment
```

### Playwright Configuration

Key configuration in `playwright.config.ts`:

```typescript
{
  timeout: 60_000,           // Global test timeout
  expect: { timeout: 10_000 }, // Assertion timeout
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
    { name: 'Mobile Chrome' },
    { name: 'Mobile Safari' },
  ]
}
```

## Test Data

### Fixture URLs
- `https://safe.test` - Mock safe domain (fast testing)
- `https://medium.test` - Mock medium risk domain
- `https://high.test` - Mock high risk domain

### Real URLs
- `https://example.com` - Standard test domain
- `http://example.com` - HTTP redirect testing

## CI/CD Integration

### GitHub Actions Workflow

The E2E tests run automatically on:
- Push to `main` or `dev` branches
- Pull requests
- Daily schedule (2 AM UTC)

Matrix testing across:
- Browsers: Chrome, Firefox, Safari
- Test suites: All major test categories
- Environments: Different configurations

### Reports Generated

1. **HTML Report**: Visual test results with screenshots
2. **JSON Report**: Machine-readable results for analysis
3. **JUnit Report**: CI integration compatibility
4. **Performance Report**: Custom performance metrics
5. **Accessibility Report**: WCAG compliance summary

## Performance Requirements

### Critical Requirements (Must Pass)

| Metric | Threshold | Test Suite |
|--------|-----------|------------|
| Scan Completion | <3 seconds | Performance |
| Page Load | <5 seconds | Performance |
| Database Query | <50ms | Performance |
| WCAG AA Compliance | 100% | Accessibility |

### Performance Targets

| Metric | Target | Monitoring |
|--------|--------|------------|
| Memory Growth | <50% | Benchmarking |
| Cache Hit Rate | >80% | Performance |
| Network Payload | <5MB | Benchmarking |
| Success Rate (Load) | >80% | Benchmarking |

## Debugging

### Running Tests Locally

```bash
# Run in headed mode to see browser
./tests/e2e/scripts/run-tests.sh --headless false

# Run specific test with debugging
pnpm exec playwright test --debug --grep "Core scanning journey"

# Generate trace files
pnpm exec playwright test --trace on
```

### Common Issues

1. **Application not running**: Ensure `make dev` is running
2. **Port conflicts**: Check if port 8080 is available
3. **Database issues**: Run `make migrate` and `make seed`
4. **Browser installation**: Run `pnpm exec playwright install`

### Log Files

- Application logs: `app.log` (during test runs)
- Test results: `test-results/` directory
- Screenshots: Captured automatically on failures
- Videos: Recorded for failed tests

## Contributing

### Adding New Tests

1. Create test file in appropriate directory:
   - `tests/` - Main test files
   - `pages/` - Page object models
   - `utils/` - Shared utilities

2. Follow naming convention: `feature-name.spec.ts`

3. Use page object pattern:
   ```typescript
   import { HomePage } from '../pages/HomePage';

   test('feature test', async ({ page }) => {
     const homePage = new HomePage(page);
     await homePage.goto();
     // ... test implementation
   });
   ```

4. Add performance measurements:
   ```typescript
   const { duration } = await measurePerformance(
     async () => {
       // action to measure
     },
     'Action description'
   );
   ```

### Page Object Model

Each page has a corresponding page object with:
- Locators for all interactive elements
- Methods for common actions
- Assertions for page state validation

Example:
```typescript
export class HomePage {
  readonly urlInput: Locator;
  readonly scanButton: Locator;

  async startScan(url: string) {
    await this.urlInput.fill(url);
    await this.scanButton.click();
  }
}
```

## Best Practices

### Test Design
- Use data-testid attributes for stable selectors
- Implement proper waits and timeouts
- Test both positive and negative scenarios
- Include accessibility checks in every test

### Performance Testing
- Measure critical user journeys
- Set appropriate performance thresholds
- Monitor for memory leaks
- Test under load conditions

### Security Testing
- Validate input sanitization
- Test error handling
- Check for information disclosure
- Verify CSRF protection

### Accessibility Testing
- Run axe-core on every page
- Test keyboard navigation
- Validate ARIA implementation
- Check mobile responsiveness

## Monitoring & Alerts

### Performance Monitoring
- Track scan completion times
- Monitor database query performance
- Alert on performance regressions
- Generate trend reports

### Accessibility Monitoring
- WCAG compliance scoring
- Mobile usability metrics
- Keyboard navigation success rates
- Screen reader compatibility

### Security Monitoring
- Failed security tests alerts
- Input validation bypass attempts
- Rate limiting effectiveness
- Error boundary activations

---

For more information, see the individual test files and the main project documentation.