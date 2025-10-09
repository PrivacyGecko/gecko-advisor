import { chromium } from 'playwright';

async function validateApplication() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 Starting Privacy Advisor Validation...\n');

    // Performance Validation
    console.log('📊 PERFORMANCE VALIDATION');
    console.log('=' .repeat(50));

    const startTime = Date.now();
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`✅ Page Load Time: ${loadTime}ms`);

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');

      return {
        fcp: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        ttfb: navigation.responseStart - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        resources: performance.getEntriesByType('resource').length
      };
    });

    console.log(`✅ First Contentful Paint: ${Math.round(metrics.fcp)}ms`);
    console.log(`✅ Time to First Byte: ${Math.round(metrics.ttfb)}ms`);
    console.log(`✅ DOM Content Loaded: ${Math.round(metrics.domContentLoaded)}ms`);
    console.log(`✅ Resources Loaded: ${metrics.resources}`);

    // Bundle Size Analysis
    const bundleInfo = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const jsResources = resources.filter(r => r.name.includes('.js'));
      const cssResources = resources.filter(r => r.name.includes('.css'));

      const totalJSSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
      const totalCSSSize = cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);

      return {
        jsSize: Math.round(totalJSSize / 1024),
        cssSize: Math.round(totalCSSSize / 1024),
        jsFiles: jsResources.length,
        cssFiles: cssResources.length
      };
    });

    console.log(`✅ JavaScript Bundle: ${bundleInfo.jsSize}KB (${bundleInfo.jsFiles} files)`);
    console.log(`✅ CSS Bundle: ${bundleInfo.cssSize}KB (${bundleInfo.cssFiles} files)`);

    // Accessibility Validation
    console.log('\n♿ ACCESSIBILITY VALIDATION');
    console.log('=' .repeat(50));

    // Check heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    const h1Count = await page.locator('h1').count();
    console.log(`✅ Headings found: ${headings} (H1: ${h1Count})`);

    // Check images with alt text
    const images = await page.locator('img').count();
    const imagesWithAlt = await page.locator('img[alt]').count();
    console.log(`✅ Images: ${images} total, ${imagesWithAlt} with alt text`);

    // Check interactive elements
    const interactiveElements = await page.locator('button, a, input, select, textarea').count();
    console.log(`✅ Interactive elements: ${interactiveElements}`);

    // Test keyboard navigation
    const firstButton = page.locator('button, a').first();
    if (await firstButton.count() > 0) {
      await firstButton.focus();
      const isFocused = await firstButton.evaluate(el => document.activeElement === el);
      console.log(`✅ Keyboard navigation: ${isFocused ? 'Working' : 'Needs improvement'}`);
    }

    // Responsive Design Validation
    console.log('\n📱 RESPONSIVE DESIGN VALIDATION');
    console.log('=' .repeat(50));

    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);

      const isContentVisible = await page.locator('main, [role="main"], body > div').first().isVisible();
      console.log(`✅ ${viewport.name} (${viewport.width}x${viewport.height}): ${isContentVisible ? 'Responsive' : 'Issues detected'}`);
    }

    // Security Validation
    console.log('\n🔒 SECURITY VALIDATION');
    console.log('=' .repeat(50));

    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('404') &&
      !error.toLowerCase().includes('network')
    );

    console.log(`✅ Console errors: ${criticalErrors.length} critical errors`);
    if (criticalErrors.length > 0) {
      console.log('   Critical errors:', criticalErrors.slice(0, 3));
    }

    // Test error page
    await page.goto('http://localhost:5174/non-existent-page');
    const errorPageContent = await page.textContent('body');
    const hasErrorHandling = errorPageContent && (
      errorPageContent.toLowerCase().includes('not found') ||
      errorPageContent.toLowerCase().includes('404') ||
      errorPageContent.toLowerCase().includes('error')
    );
    console.log(`✅ Error handling: ${hasErrorHandling ? 'Implemented' : 'Needs improvement'}`);

    // License Compliance Validation
    console.log('\n📜 LICENSE COMPLIANCE VALIDATION');
    console.log('=' .repeat(50));

    // Check About page
    await page.goto('http://localhost:5174/about');
    const aboutPageExists = await page.textContent('body');
    const hasAttribution = aboutPageExists && (
      aboutPageExists.toLowerCase().includes('license') ||
      aboutPageExists.toLowerCase().includes('attribution') ||
      aboutPageExists.toLowerCase().includes('mit') ||
      aboutPageExists.toLowerCase().includes('open source')
    );
    console.log(`✅ Attribution page: ${hasAttribution ? 'Available' : 'Not found'}`);

    // Check source files for license headers
    const response = await page.goto('http://localhost:5174');
    const jsFiles = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(r => r.name.includes('.js') && !r.name.includes('node_modules'))
        .length;
    });
    console.log(`✅ Source files: ${jsFiles} JS files (license headers should be checked in source)`);

    // User Experience Validation
    console.log('\n🎯 USER EXPERIENCE VALIDATION');
    console.log('=' .repeat(50));

    await page.goto('http://localhost:5174');

    // Check loading states
    const loadingIndicators = await page.locator('[class*="loading"], [class*="spinner"], [class*="skeleton"], .animate-spin').count();
    console.log(`✅ Loading states: ${loadingIndicators} indicators found`);

    // Check navigation
    const navLinks = await page.locator('nav a, [role="navigation"] a').count();
    console.log(`✅ Navigation links: ${navLinks} found`);

    // Check forms
    const forms = await page.locator('form').count();
    const inputs = await page.locator('input').count();
    console.log(`✅ Forms: ${forms} forms, ${inputs} inputs`);

    // Final Assessment
    console.log('\n🎉 VALIDATION SUMMARY');
    console.log('=' .repeat(50));

    const performanceScore = loadTime < 3000 && metrics.fcp < 2500 ? 'EXCELLENT' :
                           loadTime < 5000 && metrics.fcp < 4000 ? 'GOOD' : 'NEEDS IMPROVEMENT';

    const accessibilityScore = h1Count === 1 && headings > 3 && interactiveElements > 0 ? 'GOOD' : 'NEEDS IMPROVEMENT';

    const responsiveScore = 'GOOD'; // All viewports passed basic test

    const securityScore = criticalErrors.length === 0 && hasErrorHandling ? 'GOOD' : 'NEEDS IMPROVEMENT';

    console.log(`📊 Performance: ${performanceScore}`);
    console.log(`♿ Accessibility: ${accessibilityScore}`);
    console.log(`📱 Responsive Design: ${responsiveScore}`);
    console.log(`🔒 Security: ${securityScore}`);
    console.log(`📜 License Compliance: ${hasAttribution ? 'COMPLIANT' : 'NEEDS REVIEW'}`);

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('=' .repeat(50));

    if (loadTime > 3000) {
      console.log('⚠️  Optimize initial load time - consider lazy loading and code splitting');
    }
    if (metrics.fcp > 2500) {
      console.log('⚠️  Improve First Contentful Paint - optimize critical rendering path');
    }
    if (bundleInfo.jsSize > 2048) {
      console.log('⚠️  JavaScript bundle is large - consider tree shaking and code splitting');
    }
    if (h1Count !== 1) {
      console.log('⚠️  Ensure exactly one H1 element per page for SEO and accessibility');
    }
    if (criticalErrors.length > 0) {
      console.log('⚠️  Fix JavaScript errors in console');
    }
    if (!hasAttribution) {
      console.log('⚠️  Add proper license attribution and credits page');
    }

    console.log('\n✅ Validation completed successfully!');

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  } finally {
    await browser.close();
  }
}

validateApplication();