import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

/**
 * Performance monitoring thresholds
 */
const PERFORMANCE_THRESHOLDS = {
  SLOW_REQUEST: 3000,    // 3 seconds - our target response time
  WARN_REQUEST: 2000,    // 2 seconds - warning threshold
  CRITICAL_REQUEST: 5000, // 5 seconds - critical threshold
} as const;

/**
 * Interface for tracking performance metrics
 */
interface PerformanceMetrics {
  requestId: string;
  method: string;
  path: string;
  startTime: number;
  userAgent?: string;
  ip?: string;
}

/**
 * Performance monitoring middleware that tracks response times and logs slow requests
 */
export function performanceMonitor(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = res.locals.requestId || 'unknown';

  const metrics: PerformanceMetrics = {
    requestId,
    method: req.method,
    path: req.path,
    startTime,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  };

  // Override res.end to capture response time
  const originalEnd = res.end.bind(res);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (res as any).end = function(...args: any[]) {
    const duration = Date.now() - startTime;

    // Log performance metrics
    logPerformanceMetrics(metrics, duration, res.statusCode);

    // Call original end method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalEnd as any).apply(this, args);
  };

  // Continue to next middleware
  next();
}

/**
 * Log performance metrics based on response time thresholds
 */
function logPerformanceMetrics(
  metrics: PerformanceMetrics,
  duration: number,
  statusCode: number
): void {
  const logData = {
    requestId: metrics.requestId,
    method: metrics.method,
    path: metrics.path,
    duration,
    statusCode,
    userAgent: metrics.userAgent,
    ip: metrics.ip,
    timestamp: new Date().toISOString(),
  };

  // Log based on performance thresholds
  if (duration >= PERFORMANCE_THRESHOLDS.CRITICAL_REQUEST) {
    logger.error(logData, 'CRITICAL: Request exceeded 5 second threshold');
  } else if (duration >= PERFORMANCE_THRESHOLDS.SLOW_REQUEST) {
    logger.warn(logData, 'SLOW: Request exceeded 3 second target response time');
  } else if (duration >= PERFORMANCE_THRESHOLDS.WARN_REQUEST) {
    logger.warn(logData, 'WARNING: Request approaching 3 second target');
  } else {
    // Only log fast requests in debug mode
    logger.debug(logData, 'Request completed within target time');
  }

  // Log additional warnings for specific endpoints
  if (metrics.path.includes('/reports/recent') && duration > 1000) {
    logger.warn({
      ...logData,
      endpoint: 'recent_reports',
    }, 'Recent reports endpoint slower than expected - check caching');
  }

  if (metrics.path.includes('/status') && duration > 500) {
    logger.warn({
      ...logData,
      endpoint: 'scan_status',
    }, 'Scan status endpoint slower than expected - check database queries');
  }

  // Track error responses
  if (statusCode >= 500) {
    logger.error({
      ...logData,
      category: 'server_error',
    }, 'Server error response');
  } else if (statusCode >= 400) {
    logger.warn({
      ...logData,
      category: 'client_error',
    }, 'Client error response');
  }
}

/**
 * Express middleware for timing specific database operations
 */
export function createDatabaseTimer(operationName: string) {
  return function databaseTimer<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    return operation().then(
      (result) => {
        const duration = Date.now() - startTime;

        if (duration > 1000) {
          logger.warn({
            operation: operationName,
            duration,
          }, 'Slow database operation detected');
        } else {
          logger.debug({
            operation: operationName,
            duration,
          }, 'Database operation completed');
        }

        return result;
      },
      (error) => {
        const duration = Date.now() - startTime;

        logger.error({
          operation: operationName,
          duration,
          error,
        }, 'Database operation failed');

        throw error;
      }
    );
  };
}

/**
 * Helper to time async operations
 */
export async function timeOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  warnThreshold = 1000
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    if (duration > warnThreshold) {
      logger.warn({
        operation: operationName,
        duration,
      }, `Slow operation: ${operationName}`);
    } else {
      logger.debug({
        operation: operationName,
        duration,
      }, `Operation completed: ${operationName}`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error({
      operation: operationName,
      duration,
      error,
    }, `Operation failed: ${operationName}`);

    throw error;
  }
}

/**
 * Middleware to add performance headers to responses
 */
export function addPerformanceHeaders(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Override res.end to add timing header
  const originalEnd = res.end.bind(res);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (res as any).end = function(...args: any[]) {
    const duration = Date.now() - startTime;

    // Add performance headers
    res.set('X-Response-Time', `${duration}ms`);
    res.set('X-Request-ID', res.locals.requestId);

    // Add performance class header
    if (duration >= PERFORMANCE_THRESHOLDS.SLOW_REQUEST) {
      res.set('X-Performance-Class', 'slow');
    } else if (duration >= PERFORMANCE_THRESHOLDS.WARN_REQUEST) {
      res.set('X-Performance-Class', 'warning');
    } else {
      res.set('X-Performance-Class', 'fast');
    }

    // Call original end method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalEnd as any).apply(this, args);
  };

  next();
}