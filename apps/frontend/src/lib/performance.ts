/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Performance monitoring utilities for Privacy Advisor frontend
 *
 * Features:
 * - Core Web Vitals tracking
 * - Bundle size monitoring
 * - User interaction metrics
 * - Performance reporting for optimization
 */

export interface PerformanceMetrics {
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte
}

/**
 * Monitor Core Web Vitals and report metrics
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // LCP Observer
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry;
          if (lastEntry) {
            this.metrics.LCP = lastEntry.startTime;
            this.reportMetric('LCP', lastEntry.startTime);
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // FID Observer
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-input-delay') {
              this.metrics.FID = entry.duration;
              this.reportMetric('FID', entry.duration);
            }
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // CLS Observer
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.metrics.CLS = clsValue;
          this.reportMetric('CLS', clsValue);
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }

    // Navigation Timing
    if ('performance' in window && performance.timing) {
      window.addEventListener('load', () => {
        const timing = performance.timing;
        const ttfb = timing.responseStart - timing.navigationStart;
        const fcp = timing.loadEventEnd - timing.navigationStart;

        this.metrics.TTFB = ttfb;
        this.metrics.FCP = fcp;

        this.reportMetric('TTFB', ttfb);
        this.reportMetric('FCP', fcp);
      });
    }
  }

  private reportMetric(name: string, value: number) {
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance Metric - ${name}: ${value.toFixed(2)}ms`);
    }

    // In production, send to analytics service
    // Example: analytics.track('performance_metric', { metric: name, value });
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if Core Web Vitals are within acceptable thresholds
   */
  getCoreWebVitalsReport(): {
    LCP: { value: number; status: 'good' | 'needs-improvement' | 'poor' };
    FID: { value: number; status: 'good' | 'needs-improvement' | 'poor' };
    CLS: { value: number; status: 'good' | 'needs-improvement' | 'poor' };
  } | null {
    const { LCP, FID, CLS } = this.metrics;

    if (LCP === undefined || FID === undefined || CLS === undefined) {
      return null;
    }

    return {
      LCP: {
        value: LCP,
        status: LCP <= 2500 ? 'good' : LCP <= 4000 ? 'needs-improvement' : 'poor'
      },
      FID: {
        value: FID,
        status: FID <= 100 ? 'good' : FID <= 300 ? 'needs-improvement' : 'poor'
      },
      CLS: {
        value: CLS,
        status: CLS <= 0.1 ? 'good' : CLS <= 0.25 ? 'needs-improvement' : 'poor'
      }
    };
  }

  /**
   * Disconnect all observers
   */
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

/**
 * Monitor bundle size and report warnings
 */
export function monitorBundleSize() {
  if (process.env.NODE_ENV === 'development') {
    window.addEventListener('load', () => {
      // Estimate bundle size from performance entries
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resources.filter(resource =>
        resource.name.includes('.js') && !resource.name.includes('node_modules')
      );

      let totalSize = 0;
      jsResources.forEach(resource => {
        if (resource.transferSize) {
          totalSize += resource.transferSize;
        }
      });

      const totalSizeMB = totalSize / (1024 * 1024);
      console.log(`Bundle size estimate: ${totalSizeMB.toFixed(2)} MB`);

      if (totalSizeMB > 2) {
        console.warn('Bundle size is larger than 2MB. Consider code splitting or removing unused dependencies.');
      }
    });
  }
}

/**
 * Track user interactions for performance analysis
 */
export function trackUserInteraction(action: string, element?: string) {
  const startTime = performance.now();

  return {
    end: () => {
      const duration = performance.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        console.log(`Interaction - ${action}${element ? ` on ${element}` : ''}: ${duration.toFixed(2)}ms`);
      }
      // In production, send to analytics
      // analytics.track('user_interaction', { action, element, duration });
    }
  };
}

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring() {
  const monitor = new PerformanceMonitor();
  monitorBundleSize();

  // Report final metrics after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const report = monitor.getCoreWebVitalsReport();
      if (report && process.env.NODE_ENV === 'development') {
        console.table(report);
      }
    }, 5000); // Wait 5 seconds to ensure all metrics are captured
  });

  return monitor;
}

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  initializePerformanceMonitoring();
}