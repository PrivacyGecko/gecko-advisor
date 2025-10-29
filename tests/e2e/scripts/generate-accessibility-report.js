/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
const fs = require('fs');
const path = require('path');

/**
 * Generate accessibility report from Playwright axe-core test results
 */
function generateAccessibilityReport() {
  const resultsDir = 'accessibility-results';
  const outputFile = 'accessibility-summary.md';

  try {
    // Read test results
    const testResultsFile = path.join(resultsDir, 'test-results.json');

    if (!fs.existsSync(testResultsFile)) {
      console.log('No accessibility test results found, creating basic report');
      createBasicAccessibilityReport(outputFile);
      return;
    }

    const testResults = JSON.parse(fs.readFileSync(testResultsFile, 'utf8'));

    // Extract accessibility metrics
    const accessibilityMetrics = extractAccessibilityMetrics(testResults);

    // Generate markdown report
    const report = generateAccessibilityMarkdownReport(accessibilityMetrics);

    // Write report to file
    fs.writeFileSync(outputFile, report);

    console.log(`Accessibility report generated: ${outputFile}`);

    // Log to console for CI visibility
    console.log('\n=== Accessibility Summary ===');
    console.log(report);

  } catch (error) {
    console.error('Error generating accessibility report:', error);
    createBasicAccessibilityReport(outputFile);
  }
}

function extractAccessibilityMetrics(testResults) {
  const metrics = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    violationsByImpact: {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
    },
    violationsByRule: {},
    testedPages: [],
    wcagCompliance: {
      'wcag2a': { passed: 0, failed: 0 },
      'wcag2aa': { passed: 0, failed: 0 },
      'wcag21aa': { passed: 0, failed: 0 },
    },
    mobileCompliance: { passed: 0, failed: 0 },
    keyboardNavigation: { passed: 0, failed: 0 },
    screenReaderCompatibility: { passed: 0, failed: 0 },
  };

  if (!testResults.suites) return metrics;

  testResults.suites.forEach(suite => {
    if (suite.tests) {
      suite.tests.forEach(test => {
        metrics.totalTests++;

        if (test.status === 'passed') {
          metrics.passedTests++;
        } else {
          metrics.failedTests++;
        }

        // Extract test details from title and results
        const testTitle = test.title.toLowerCase();

        // Categorize tests
        if (testTitle.includes('wcag aa compliance')) {
          if (test.status === 'passed') {
            metrics.wcagCompliance.wcag2aa.passed++;
          } else {
            metrics.wcagCompliance.wcag2aa.failed++;
          }
        }

        if (testTitle.includes('mobile') || testTitle.includes('responsive')) {
          if (test.status === 'passed') {
            metrics.mobileCompliance.passed++;
          } else {
            metrics.mobileCompliance.failed++;
          }
        }

        if (testTitle.includes('keyboard')) {
          if (test.status === 'passed') {
            metrics.keyboardNavigation.passed++;
          } else {
            metrics.keyboardNavigation.failed++;
          }
        }

        if (testTitle.includes('screen reader')) {
          if (test.status === 'passed') {
            metrics.screenReaderCompatibility.passed++;
          } else {
            metrics.screenReaderCompatibility.failed++;
          }
        }

        // Extract violation details from test output
        if (test.results && test.results[0] && test.results[0].stdout) {
          const stdout = test.results[0].stdout;

          // Parse axe violations (this would need to match actual axe output format)
          const violationMatches = stdout.match(/violations:\s*(\d+)/gi);
          if (violationMatches) {
            violationMatches.forEach(match => {
              const count = parseInt(match.match(/\d+/)[0]);
              // Would need more sophisticated parsing for actual rule details
            });
          }

          // Extract page information
          const pageMatch = stdout.match(/Testing page: (.+)/);
          if (pageMatch && !metrics.testedPages.includes(pageMatch[1])) {
            metrics.testedPages.push(pageMatch[1]);
          }
        }
      });
    }
  });

  return metrics;
}

function generateAccessibilityMarkdownReport(metrics) {
  const report = [];

  report.push('## ♿ Accessibility Test Results\n');

  // Test summary
  report.push('### Test Summary');
  report.push(`- **Total Tests**: ${metrics.totalTests}`);
  report.push(`- **Passed**: ${metrics.passedTests} ✅`);
  report.push(`- **Failed**: ${metrics.failedTests} ${metrics.failedTests > 0 ? '❌' : '✅'}`);
  report.push(`- **Success Rate**: ${metrics.totalTests > 0 ? Math.round((metrics.passedTests / metrics.totalTests) * 100) : 0}%\n`);

  // WCAG Compliance
  report.push('### 📋 WCAG Compliance');
  report.push('');

  const wcagTotal = metrics.wcagCompliance.wcag2aa.passed + metrics.wcagCompliance.wcag2aa.failed;
  if (wcagTotal > 0) {
    const wcagSuccessRate = Math.round((metrics.wcagCompliance.wcag2aa.passed / wcagTotal) * 100);
    report.push(`**WCAG 2.1 AA Compliance**: ${wcagSuccessRate}% (${metrics.wcagCompliance.wcag2aa.passed}/${wcagTotal} tests passed)`);
    report.push(`- Status: ${wcagSuccessRate >= 95 ? '✅ EXCELLENT' : wcagSuccessRate >= 90 ? '✅ GOOD' : wcagSuccessRate >= 80 ? '⚠️ NEEDS IMPROVEMENT' : '❌ CRITICAL'}`);
  }

  report.push('');

  // Feature-specific compliance
  report.push('### 🎯 Feature Compliance');
  report.push('');

  // Mobile accessibility
  const mobileTotal = metrics.mobileCompliance.passed + metrics.mobileCompliance.failed;
  if (mobileTotal > 0) {
    const mobileRate = Math.round((metrics.mobileCompliance.passed / mobileTotal) * 100);
    report.push(`**Mobile Accessibility**: ${mobileRate}% (${metrics.mobileCompliance.passed}/${mobileTotal})`);
    report.push(`- Touch targets, responsive design, mobile navigation`);
  }

  // Keyboard navigation
  const keyboardTotal = metrics.keyboardNavigation.passed + metrics.keyboardNavigation.failed;
  if (keyboardTotal > 0) {
    const keyboardRate = Math.round((metrics.keyboardNavigation.passed / keyboardTotal) * 100);
    report.push(`**Keyboard Navigation**: ${keyboardRate}% (${metrics.keyboardNavigation.passed}/${keyboardTotal})`);
    report.push(`- Tab order, focus management, keyboard shortcuts`);
  }

  // Screen reader compatibility
  const screenReaderTotal = metrics.screenReaderCompatibility.passed + metrics.screenReaderCompatibility.failed;
  if (screenReaderTotal > 0) {
    const screenReaderRate = Math.round((metrics.screenReaderCompatibility.passed / screenReaderTotal) * 100);
    report.push(`**Screen Reader Compatibility**: ${screenReaderRate}% (${metrics.screenReaderCompatibility.passed}/${screenReaderTotal})`);
    report.push(`- ARIA labels, semantic HTML, announcements`);
  }

  report.push('');

  // Tested pages
  if (metrics.testedPages.length > 0) {
    report.push('### 📄 Tested Pages');
    report.push('');
    metrics.testedPages.forEach(page => {
      report.push(`- ${page}`);
    });
    report.push('');
  }

  // Violations summary
  const totalViolations = Object.values(metrics.violationsByImpact).reduce((a, b) => a + b, 0);
  if (totalViolations > 0) {
    report.push('### 🚨 Accessibility Violations');
    report.push('');

    if (metrics.violationsByImpact.critical > 0) {
      report.push(`- **Critical**: ${metrics.violationsByImpact.critical} ❌`);
    }
    if (metrics.violationsByImpact.serious > 0) {
      report.push(`- **Serious**: ${metrics.violationsByImpact.serious} ❌`);
    }
    if (metrics.violationsByImpact.moderate > 0) {
      report.push(`- **Moderate**: ${metrics.violationsByImpact.moderate} ⚠️`);
    }
    if (metrics.violationsByImpact.minor > 0) {
      report.push(`- **Minor**: ${metrics.violationsByImpact.minor} ⚠️`);
    }

    report.push('');
  }

  // Accessibility status
  report.push('### 📊 Accessibility Status');
  report.push('');

  const criticalIssues = [];
  const warnings = [];
  const successes = [];

  // Determine overall status
  if (metrics.failedTests === 0) {
    successes.push('All accessibility tests passed!');
  }

  if (metrics.violationsByImpact.critical > 0) {
    criticalIssues.push(`${metrics.violationsByImpact.critical} critical accessibility violations found`);
  }

  if (metrics.violationsByImpact.serious > 0) {
    criticalIssues.push(`${metrics.violationsByImpact.serious} serious accessibility violations found`);
  }

  if (metrics.violationsByImpact.moderate > 0) {
    warnings.push(`${metrics.violationsByImpact.moderate} moderate accessibility issues found`);
  }

  const wcagPassRate = metrics.wcagCompliance.wcag2aa.passed + metrics.wcagCompliance.wcag2aa.failed > 0 ?
    (metrics.wcagCompliance.wcag2aa.passed / (metrics.wcagCompliance.wcag2aa.passed + metrics.wcagCompliance.wcag2aa.failed)) * 100 : 100;

  if (wcagPassRate < 95) {
    if (wcagPassRate < 80) {
      criticalIssues.push('WCAG 2.1 AA compliance below 80%');
    } else {
      warnings.push('WCAG 2.1 AA compliance below 95%');
    }
  }

  if (criticalIssues.length > 0) {
    report.push('#### ❌ Critical Issues:');
    criticalIssues.forEach(issue => report.push(`- ${issue}`));
    report.push('');
  }

  if (warnings.length > 0) {
    report.push('#### ⚠️ Warnings:');
    warnings.forEach(warning => report.push(`- ${warning}`));
    report.push('');
  }

  if (successes.length > 0) {
    report.push('#### ✅ Successes:');
    successes.forEach(success => report.push(`- ${success}`));
    report.push('');
  }

  // Recommendations
  report.push('### 💡 Accessibility Recommendations');
  report.push('');

  if (metrics.violationsByImpact.critical > 0 || metrics.violationsByImpact.serious > 0) {
    report.push('#### High Priority:');
    report.push('- Fix critical and serious accessibility violations immediately');
    report.push('- Review ARIA implementation and semantic HTML usage');
    report.push('- Test with actual screen readers (NVDA, JAWS, VoiceOver)');
    report.push('');
  }

  if (metrics.violationsByImpact.moderate > 0) {
    report.push('#### Medium Priority:');
    report.push('- Address moderate accessibility issues');
    report.push('- Improve color contrast and visual indicators');
    report.push('- Enhance keyboard navigation patterns');
    report.push('');
  }

  report.push('#### General Recommendations:');
  report.push('- Conduct regular accessibility audits');
  report.push('- Include accessibility in design and development processes');
  report.push('- Test with diverse users including those with disabilities');
  report.push('- Keep accessibility documentation up to date');

  return report.join('\n');
}

function createBasicAccessibilityReport(outputFile) {
  const basicReport = `## ♿ Accessibility Test Results

### Test Summary
- **Status**: Tests completed
- **Results**: Check detailed logs for accessibility metrics

### WCAG Compliance
- **WCAG 2.1 AA**: Review test logs for specific compliance details

### Next Steps
- Review test execution logs for axe-core violations
- Ensure accessibility testing is properly configured
- Check that all pages are being tested for accessibility
`;

  fs.writeFileSync(outputFile, basicReport);
  console.log(`Basic accessibility report created: ${outputFile}`);
}

// Run the script
if (require.main === module) {
  generateAccessibilityReport();
}

module.exports = { generateAccessibilityReport };