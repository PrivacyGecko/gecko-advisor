import rateLimit from 'express-rate-limit';
import type { Options as RateLimitOptions } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { getQueueMetrics } from '../queue.js';
import { CacheService } from '../cache.js';

/**
 * Rate limiting configuration based on scan complexity and system load
 */
interface IntelligentRateLimitOptions {
  windowMs?: number;
  baseLimit: number;
  complexityMultiplier?: Record<string, number>;
  queueBackpressureThreshold?: number;
  enableDynamicAdjustment?: boolean;
}

/**
 * Custom rate limit handler with enhanced logging
 */
const rateLimitHandler: NonNullable<RateLimitOptions['handler']> = (req, res, _next, options) => {
  const windowMs = typeof options?.windowMs === 'number' ? options.windowMs : 60_000;
  const retryAfterSeconds = Math.ceil(windowMs / 1000);

  logger.warn({
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    requestId: (res as Response).locals.requestId,
  }, 'Rate limit exceeded');

  res.setHeader('Retry-After', retryAfterSeconds.toString());
  res.status(429).json({
    error: 'rate_limited',
    message: 'Too many requests, please try again later',
    retryAfterMs: windowMs,
    retryAfterSeconds,
  });
};

/**
 * Intelligent rate limiter that adjusts limits based on:
 * - Scan complexity (simple vs complex URLs)
 * - Queue backpressure
 * - System load metrics
 */
export function createIntelligentRateLimit(options: IntelligentRateLimitOptions) {
  const {
    windowMs = 60_000,
    baseLimit,
    complexityMultiplier = {
      simple: 1.0,
      complex: 0.5, // Reduce limit for complex scans
      bulk: 0.3,    // Even more restrictive for bulk operations
    },
    queueBackpressureThreshold = 100,
    enableDynamicAdjustment = true,
  } = options;

  return rateLimit({
    windowMs,
    limit: async (req: Request, res: Response) => {
      try {
        // Determine scan complexity from request
        const scanComplexity = await determineScanComplexity(req);

        // Get base limit adjustment for complexity
        const complexityAdjustment = complexityMultiplier[scanComplexity] || 1.0;
        let adjustedLimit = Math.floor(baseLimit * complexityAdjustment);

        // Apply dynamic adjustment based on system load
        if (enableDynamicAdjustment) {
          const loadAdjustment = await calculateLoadAdjustment(queueBackpressureThreshold);
          adjustedLimit = Math.floor(adjustedLimit * loadAdjustment);
        }

        // Ensure minimum limit of 1
        const finalLimit = Math.max(1, adjustedLimit);

        logger.debug({
          scanComplexity,
          baseLimit,
          complexityAdjustment,
          finalLimit,
          requestId: res.locals.requestId,
        }, 'Dynamic rate limit calculated');

        return finalLimit;
      } catch (error) {
        logger.error({ error }, 'Error calculating dynamic rate limit, using base limit');
        return baseLimit;
      }
    },
    keyGenerator: (req) => {
      // Use IP and user agent for more accurate rate limiting
      const ip = req.ip ?? req.headers['x-forwarded-for']?.toString() ?? 'anonymous';
      const userAgent = req.get('User-Agent') ?? 'unknown';
      return `${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 16)}`;
    },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: (req) => {
      // Skip rate limiting for health checks and admin endpoints
      return req.path.startsWith('/healthz') || req.path.startsWith('/api/admin');
    },
  });
}

/**
 * Determine scan complexity based on request parameters
 */
async function determineScanComplexity(req: Request): Promise<string> {
  try {
    const body = req.body;

    // Check for force flag (higher complexity)
    if (body?.force === true) {
      return 'complex';
    }

    // Analyze URL complexity if present
    if (body?.url && typeof body.url === 'string') {
      const url = new URL(body.url);

      // Complex URLs have many query parameters or path segments
      const queryParams = new URLSearchParams(url.search);
      const pathSegments = url.pathname.split('/').filter(Boolean);

      if (queryParams.size > 5 || pathSegments.length > 4) {
        return 'complex';
      }

      // Check for known complex domains
      const complexDomains = ['facebook.com', 'google.com', 'amazon.com'];
      if (complexDomains.some(domain => url.hostname.includes(domain))) {
        return 'complex';
      }
    }

    // Check for bulk operations
    if (req.path.includes('bulk') || body?.batch === true) {
      return 'bulk';
    }

    return 'simple';
  } catch (error) {
    logger.debug({ error }, 'Error determining scan complexity, defaulting to simple');
    return 'simple';
  }
}

/**
 * Calculate load adjustment factor based on queue metrics
 */
async function calculateLoadAdjustment(queueThreshold: number): Promise<number> {
  const cacheKey = 'queue_load_adjustment';

  // Cache the adjustment calculation for 30 seconds
  return CacheService.getOrSet(
    cacheKey,
    async () => {
      try {
        const metrics = await getQueueMetrics();
        if (!metrics) return 1.0;

        const { totalPending, failed } = metrics;

        // Reduce limits if queue is backing up
        if (totalPending > queueThreshold) {
          const backpressureFactor = Math.min(totalPending / queueThreshold, 3.0);
          return Math.max(0.1, 1.0 / backpressureFactor);
        }

        // Reduce limits if failure rate is high
        const totalJobs = totalPending + failed;
        if (totalJobs > 0) {
          const failureRate = failed / totalJobs;
          if (failureRate > 0.1) { // 10% failure rate
            return Math.max(0.5, 1.0 - failureRate);
          }
        }

        return 1.0;
      } catch (error) {
        logger.warn({ error }, 'Error calculating load adjustment');
        return 1.0;
      }
    },
    30 // 30 seconds cache
  );
}

/**
 * Pre-configured rate limiters for different endpoints
 */
export const scanRateLimit = createIntelligentRateLimit({
  baseLimit: config.rateLimitScanPerMinute,
  complexityMultiplier: {
    simple: 1.0,
    complex: 0.6,
    bulk: 0.3,
  },
  queueBackpressureThreshold: 50,
  enableDynamicAdjustment: true,
});

export const reportRateLimit = createIntelligentRateLimit({
  baseLimit: config.rateLimitReportPerMinute,
  complexityMultiplier: {
    simple: 1.0,
    complex: 0.8, // Reports are less resource-intensive
    bulk: 0.5,
  },
  queueBackpressureThreshold: 100,
  enableDynamicAdjustment: false, // Reports don't need queue-based adjustment
});

export const generalRateLimit = createIntelligentRateLimit({
  baseLimit: config.rateLimitPerMinute,
  complexityMultiplier: {
    simple: 1.0,
    complex: 1.0,
    bulk: 0.7,
  },
  enableDynamicAdjustment: false,
});