/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
const fs = require('fs');
const path = require('path');

/**
 * Generate performance report from Playwright test results
 */
function generatePerformanceReport() {
  const resultsDir = 'benchmark-results';
  const outputFile = 'performance-summary.md';

  try {
    // Read test results
    const testResultsFile = path.join(resultsDir, 'test-results.json');

    if (!fs.existsSync(testResultsFile)) {
      console.log('No test results found, creating basic report');
      createBasicReport(outputFile);
      return;
    }

    const testResults = JSON.parse(fs.readFileSync(testResultsFile, 'utf8'));

    // Extract performance metrics
    const performanceMetrics = extractPerformanceMetrics(testResults);

    // Generate markdown report
    const report = generateMarkdownReport(performanceMetrics);

    // Write report to file
    fs.writeFileSync(outputFile, report);

    console.log(`Performance report generated: ${outputFile}`);

    // Log to console for CI visibility
    console.log('\n=== Performance Summary ===');
    console.log(report);

  } catch (error) {
    console.error('Error generating performance report:', error);
    createBasicReport(outputFile);
  }
}

function extractPerformanceMetrics(testResults) {
  const metrics = {
    scanCompletionTimes: [],
    pageLoadTimes: [],
    databaseQueryTimes: [],
    apiResponseTimes: [],
    memoryUsage: [],
    passedTests: 0,
    failedTests: 0,
    totalTests: 0,
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

        // Extract timing information from test output/logs
        if (test.results && test.results[0] && test.results[0].stdout) {
          const stdout = test.results[0].stdout;

          // Parse performance logs
          const scanTimeMatch = stdout.match(/Scan completion time: ([\d.]+)ms/);
          if (scanTimeMatch) {
            metrics.scanCompletionTimes.push(parseFloat(scanTimeMatch[1]));
          }

          const pageLoadMatch = stdout.match(/(?:Home page load|Page load): ([\d.]+)ms/);
          if (pageLoadMatch) {
            metrics.pageLoadTimes.push(parseFloat(pageLoadMatch[1]));
          }

          const dbQueryMatch = stdout.match(/Database.*: ([\d.]+)ms/);
          if (dbQueryMatch) {
            metrics.databaseQueryTimes.push(parseFloat(dbQueryMatch[1]));
          }

          const apiTimeMatch = stdout.match(/API.*: ([\d.]+)ms/);
          if (apiTimeMatch) {
            metrics.apiResponseTimes.push(parseFloat(apiTimeMatch[1]));
          }

          const memoryMatch = stdout.match(/memory usage: ([\d.]+) MB/);
          if (memoryMatch) {
            metrics.memoryUsage.push(parseFloat(memoryMatch[1]));
          }
        }
      });
    }
  });

  return metrics;
}

function generateMarkdownReport(metrics) {
  const report = [];

  report.push('## 🚀 Performance Test Results\n');

  // Test summary
  report.push('### Test Summary');
  report.push(`- **Total Tests**: ${metrics.totalTests}`);
  report.push(`- **Passed**: ${metrics.passedTests} ✅`);
  report.push(`- **Failed**: ${metrics.failedTests} ${metrics.failedTests > 0 ? '❌' : '✅'}`);
  report.push(`- **Success Rate**: ${metrics.totalTests > 0 ? Math.round((metrics.passedTests / metrics.totalTests) * 100) : 0}%\n`);

  // Performance metrics
  if (metrics.scanCompletionTimes.length > 0) {
    const avgScanTime = average(metrics.scanCompletionTimes);
    const maxScanTime = Math.max(...metrics.scanCompletionTimes);
    const minScanTime = Math.min(...metrics.scanCompletionTimes);

    report.push('### 🔍 Scan Performance');
    report.push(`- **Average Scan Time**: ${avgScanTime.toFixed(2)}ms`);
    report.push(`- **Max Scan Time**: ${maxScanTime.toFixed(2)}ms`);
    report.push(`- **Min Scan Time**: ${minScanTime.toFixed(2)}ms`);
    report.push(`- **3s Requirement**: ${maxScanTime <= 3000 ? '✅ PASSED' : '❌ FAILED'}\n`);
  }

  if (metrics.pageLoadTimes.length > 0) {
    const avgPageLoad = average(metrics.pageLoadTimes);
    const maxPageLoad = Math.max(...metrics.pageLoadTimes);

    report.push('### 📄 Page Load Performance');
    report.push(`- **Average Load Time**: ${avgPageLoad.toFixed(2)}ms`);
    report.push(`- **Max Load Time**: ${maxPageLoad.toFixed(2)}ms`);
    report.push(`- **5s Requirement**: ${maxPageLoad <= 5000 ? '✅ PASSED' : '❌ FAILED'}\n`);
  }

  if (metrics.databaseQueryTimes.length > 0) {
    const avgDbTime = average(metrics.databaseQueryTimes);
    const maxDbTime = Math.max(...metrics.databaseQueryTimes);

    report.push('### 🗄️ Database Performance');
    report.push(`- **Average Query Time**: ${avgDbTime.toFixed(2)}ms`);
    report.push(`- **Max Query Time**: ${maxDbTime.toFixed(2)}ms`);
    report.push(`- **50ms Requirement**: ${maxDbTime <= 50 ? '✅ PASSED' : '❌ FAILED'}\n`);
  }

  if (metrics.apiResponseTimes.length > 0) {
    const avgApiTime = average(metrics.apiResponseTimes);
    const maxApiTime = Math.max(...metrics.apiResponseTimes);

    report.push('### 🌐 API Performance');
    report.push(`- **Average Response Time**: ${avgApiTime.toFixed(2)}ms`);
    report.push(`- **Max Response Time**: ${maxApiTime.toFixed(2)}ms`);
    report.push(`- **1s Requirement**: ${maxApiTime <= 1000 ? '✅ PASSED' : '❌ FAILED'}\n`);
  }

  if (metrics.memoryUsage.length > 0) {
    const avgMemory = average(metrics.memoryUsage);
    const maxMemory = Math.max(...metrics.memoryUsage);

    report.push('### 💾 Memory Usage');
    report.push(`- **Average Memory**: ${avgMemory.toFixed(2)}MB`);
    report.push(`- **Peak Memory**: ${maxMemory.toFixed(2)}MB`);
    report.push(`- **Memory Growth**: ${maxMemory <= avgMemory * 1.5 ? '✅ ACCEPTABLE' : '❌ HIGH'}\n`);
  }

  // Performance trends (if historical data available)
  report.push('### 📈 Performance Status');
  report.push('');

  const criticalIssues = [];
  const warnings = [];

  if (metrics.scanCompletionTimes.length > 0 && Math.max(...metrics.scanCompletionTimes) > 3000) {
    criticalIssues.push('Scan completion exceeds 3-second requirement');
  }

  if (metrics.pageLoadTimes.length > 0 && Math.max(...metrics.pageLoadTimes) > 5000) {
    criticalIssues.push('Page load time exceeds 5-second threshold');
  }

  if (metrics.databaseQueryTimes.length > 0 && Math.max(...metrics.databaseQueryTimes) > 50) {
    warnings.push('Database queries slower than 50ms target');
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

  if (criticalIssues.length === 0 && warnings.length === 0) {
    report.push('#### ✅ All performance requirements met!');
    report.push('');
  }

  // Recommendations
  report.push('### 💡 Recommendations');
  report.push('');

  if (metrics.scanCompletionTimes.length > 0) {
    const avgScanTime = average(metrics.scanCompletionTimes);
    if (avgScanTime > 2000) {
      report.push('- Consider optimizing scan algorithms or caching strategies');
    }
    if (avgScanTime > 1500) {
      report.push('- Review database query optimization opportunities');
    }
  }

  if (metrics.memoryUsage.length > 0) {
    const maxMemory = Math.max(...metrics.memoryUsage);
    if (maxMemory > 100) {
      report.push('- Monitor memory usage for potential leaks');
    }
  }

  report.push('- Continue monitoring performance trends over time');
  report.push('- Run performance tests before major releases');

  return report.join('\n');
}

function createBasicReport(outputFile) {
  const basicReport = `## 🚀 Performance Test Results

### Test Summary
- **Status**: Tests completed
- **Results**: Check detailed logs for performance metrics

### Next Steps
- Review test execution logs
- Ensure performance monitoring is properly configured
- Check that performance assertions are in place
`;

  fs.writeFileSync(outputFile, basicReport);
  console.log(`Basic performance report created: ${outputFile}`);
}

function average(numbers) {
  return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
}

// Run the script
if (require.main === module) {
  generatePerformanceReport();
}

module.exports = { generatePerformanceReport };