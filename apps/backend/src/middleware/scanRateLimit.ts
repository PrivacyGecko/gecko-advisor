import type { Request, Response, NextFunction } from 'express';
import { RateLimitService, type RateLimitInfo } from '../services/rateLimitService.js';
import { prisma } from '../prisma.js';
import type { SafeUser } from '../services/authService.js';

const rateLimitService = new RateLimitService(prisma);

/**
 * Extended Request type with rate limit information
 */
export interface RequestWithRateLimit extends Request {
  rateLimit?: RateLimitInfo;
  user?: SafeUser;
}

/**
 * Scan Rate Limiter Middleware
 *
 * Enforces daily scan limits for free tier users (3 scans/day).
 * Pro users with active subscriptions bypass rate limiting.
 *
 * Rate limits are tracked by:
 * - User ID (for authenticated users)
 * - IP address (for anonymous users)
 *
 * Returns 429 error if limit exceeded with:
 * - scansUsed, scansRemaining, resetAt
 * - upgradeUrl to pricing page
 */
export const scanRateLimiter = async (
  req: RequestWithRateLimit,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    // If Pro user with active subscription, bypass rate limiting
    if (
      user?.subscription === 'PRO' &&
      user?.subscriptionStatus === 'ACTIVE'
    ) {
      return next();
    }

    // Get identifier: user ID if logged in, IP if anonymous
    const identifier = user?.id || req.ip || 'unknown';

    // Check rate limit
    const rateLimit = await rateLimitService.checkRateLimit(identifier);

    if (!rateLimit.allowed) {
      res.status(429).json({
        type: 'rate_limit_exceeded',
        title: 'Daily Limit Reached',
        status: 429,
        detail: 'You have reached the daily limit of 3 free scans.',
        scansUsed: rateLimit.scansUsed,
        scansRemaining: rateLimit.scansRemaining,
        resetAt: rateLimit.resetAt,
        upgradeUrl: '/pricing',
      });
      return;
    }

    // Attach rate limit info to request for use in response
    req.rateLimit = rateLimit;
    next();
  } catch (error) {
    next(error);
  }
};

export { rateLimitService };
