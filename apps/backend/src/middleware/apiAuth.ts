import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';

/**
 * API key authentication middleware
 * Validates API key from X-API-Key header
 * Checks rate limits (500 calls per month for Pro users)
 * Attaches user to req.user if valid
 *
 * Use this for API endpoints that accept API key authentication
 */
export async function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      logger.debug({ url: req.url }, 'API key required: no key provided');
      problem(res, 401, 'Unauthorized', 'API key required. Provide X-API-Key header.');
      return;
    }

    // Validate API key format (pa_[32 hex chars])
    if (!apiKey.startsWith('pa_') || apiKey.length !== 35) {
      logger.debug({ url: req.url }, 'API key required: invalid format');
      problem(res, 401, 'Unauthorized', 'Invalid API key format');
      return;
    }

    // Find user by API key
    const user = await prisma.user.findUnique({
      where: { apiKey },
      select: {
        id: true,
        email: true,
        name: true,
        subscription: true,
        subscriptionStatus: true,
        apiCallsMonth: true,
        apiResetAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      logger.debug({ url: req.url }, 'API key required: key not found');
      problem(res, 401, 'Unauthorized', 'Invalid API key');
      return;
    }

    // Check if user has Pro subscription
    if (user.subscription !== 'PRO' && user.subscription !== 'TEAM') {
      logger.info(
        { userId: user.id, subscription: user.subscription },
        'API key required: user does not have Pro subscription'
      );
      problem(res, 403, 'Forbidden', 'API access requires a Pro subscription');
      return;
    }

    // Check if subscription is active
    if (user.subscriptionStatus !== 'ACTIVE' && user.subscriptionStatus !== 'TRIALING') {
      logger.info(
        { userId: user.id, subscriptionStatus: user.subscriptionStatus },
        'API key required: subscription not active'
      );
      problem(res, 403, 'Forbidden', 'Your Pro subscription is not active');
      return;
    }

    // Check if we need to reset the monthly counter
    const now = new Date();
    const resetAt = user.apiResetAt;

    if (!resetAt || now > resetAt) {
      // Reset counter (first of next month)
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          apiCallsMonth: 0,
          apiResetAt: nextReset,
        },
      });

      logger.debug({ userId: user.id, nextReset }, 'Reset API usage counter');

      // Update local user object
      user.apiCallsMonth = 0;
      user.apiResetAt = nextReset;
    }

    // Check rate limit (500 calls per month for Pro)
    const API_LIMIT_PER_MONTH = 500;

    if (user.apiCallsMonth >= API_LIMIT_PER_MONTH) {
      logger.info(
        { userId: user.id, apiCallsMonth: user.apiCallsMonth, limit: API_LIMIT_PER_MONTH },
        'API key required: rate limit exceeded'
      );
      problem(
        res,
        429,
        'Too Many Requests',
        `API rate limit exceeded. Limit: ${API_LIMIT_PER_MONTH} calls per month. Resets at: ${user.apiResetAt?.toISOString()}`
      );
      return;
    }

    // Increment API call counter
    await prisma.user.update({
      where: { id: user.id },
      data: {
        apiCallsMonth: { increment: 1 },
      },
    });

    logger.debug(
      { userId: user.id, apiCallsMonth: user.apiCallsMonth + 1 },
      'API call authenticated and counted'
    );

    // Attach user to request
    (req as Request & { user?: typeof user }).user = {
      ...user,
      apiCallsMonth: user.apiCallsMonth + 1, // Update local count
    };

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', API_LIMIT_PER_MONTH.toString());
    res.setHeader('X-RateLimit-Remaining', (API_LIMIT_PER_MONTH - user.apiCallsMonth - 1).toString());
    res.setHeader('X-RateLimit-Reset', user.apiResetAt?.toISOString() || '');

    next();
    return;
  } catch (error) {
    logger.error({ error, url: req.url }, 'API key authentication error');
    problem(res, 500, 'Internal Server Error', 'Authentication failed');
    return;
  }
}

/**
 * Combined authentication middleware
 * Accepts either JWT token (Authorization header) or API key (X-API-Key header)
 * Prioritizes API key if both are provided
 *
 * Use this for endpoints that support both authentication methods
 */
export async function requireAuthOrApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'];

  if (apiKey && typeof apiKey === 'string') {
    // Use API key authentication
    return requireApiKey(req, res, next);
  }

  // Fall back to JWT authentication
  const { requireAuth } = await import('./auth.js');
  return requireAuth(req, res, next);
}
