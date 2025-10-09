import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';

/**
 * Singleton instance of AuthService
 */
const authService = new AuthService(prisma);

/**
 * Extract JWT token from Authorization header
 * Supports "Bearer <token>" format
 *
 * @param req Express request object
 * @returns JWT token string or null if not found
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1] ?? null;
  }

  // Support raw token without "Bearer" prefix
  if (parts.length === 1) {
    return parts[0] ?? null;
  }

  return null;
}

/**
 * Optional authentication middleware
 * Attempts to authenticate user but doesn't block if no token is provided
 * If valid token is provided, attaches user to req.user
 *
 * Use this for endpoints that work for both anonymous and authenticated users
 * Example: Scan endpoints that track user if logged in, but allow anonymous usage
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      // No token provided, continue without user
      next();
      return;
    }

    // Verify token
    const payload = authService.verifyToken(token);

    // Load user from database
    const user = await authService.getUserById(payload.userId);

    // Attach user to request
    (req as Request & { user?: typeof user }).user = user;

    logger.debug({ userId: user.id }, 'Optional auth: user authenticated');
    next();
    return;
  } catch (error) {
    // Log the authentication attempt failure but continue without user
    if (error instanceof Error) {
      logger.debug({ error: error.message }, 'Optional auth: invalid token, continuing without user');
    }

    // Continue without user for optional auth
    next();
    return;
  }
}

/**
 * Required authentication middleware
 * Requires valid JWT token and attaches user to req.user
 * Returns 401 if token is missing or invalid
 *
 * Use this for endpoints that require any level of authentication
 * Example: User profile, scan history, account settings
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      logger.debug({ url: req.url }, 'Auth required: no token provided');
      problem(res, 401, 'Unauthorized', 'Authentication token required');
      return;
    }

    // Verify token
    let payload;
    try {
      payload = authService.verifyToken(token);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'TOKEN_EXPIRED') {
          logger.debug({ url: req.url }, 'Auth required: token expired');
          problem(res, 401, 'Unauthorized', 'Token expired');
          return;
        }
        if (error.message === 'INVALID_TOKEN') {
          logger.debug({ url: req.url }, 'Auth required: invalid token');
          problem(res, 401, 'Unauthorized', 'Invalid token');
          return;
        }
      }
      logger.error({ error }, 'Auth required: token verification failed');
      problem(res, 401, 'Unauthorized', 'Authentication failed');
      return;
    }

    // Load user from database
    const user = await authService.getUserById(payload.userId);

    // Attach user to request
    (req as Request & { user?: typeof user }).user = user;

    logger.debug({ userId: user.id }, 'Auth required: user authenticated');
    next();
    return;
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      logger.warn({ error }, 'Auth required: user not found');
      problem(res, 401, 'Unauthorized', 'User not found');
      return;
    }

    logger.error({ error }, 'Auth required: authentication failed');
    problem(res, 500, 'Internal Server Error', 'Authentication failed');
    return;
  }
}

/**
 * Pro tier authentication middleware
 * Requires valid JWT token AND active Pro/Team subscription
 * Returns 403 if user is not Pro tier or subscription is not active
 *
 * Use this for Pro-only features like:
 * - Unlimited scans
 * - Private scan reports
 * - Batch scanning
 * - API access
 * - URL monitoring
 */
export async function requirePro(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // First, ensure user is authenticated
    const token = extractToken(req);

    if (!token) {
      logger.debug({ url: req.url }, 'Pro required: no token provided');
      problem(res, 401, 'Unauthorized', 'Authentication token required');
      return;
    }

    // Verify token
    let payload;
    try {
      payload = authService.verifyToken(token);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'TOKEN_EXPIRED') {
          logger.debug({ url: req.url }, 'Pro required: token expired');
          problem(res, 401, 'Unauthorized', 'Token expired');
          return;
        }
        if (error.message === 'INVALID_TOKEN') {
          logger.debug({ url: req.url }, 'Pro required: invalid token');
          problem(res, 401, 'Unauthorized', 'Invalid token');
          return;
        }
      }
      logger.error({ error }, 'Pro required: token verification failed');
      problem(res, 401, 'Unauthorized', 'Authentication failed');
      return;
    }

    // Load user from database
    const user = await authService.getUserById(payload.userId);

    // Check if user has Pro or Team subscription
    if (user.subscription !== 'PRO' && user.subscription !== 'TEAM') {
      logger.info(
        { userId: user.id, subscription: user.subscription },
        'Pro required: insufficient subscription tier'
      );
      problem(
        res,
        403,
        'Forbidden',
        'This feature requires a Pro subscription. Please upgrade your account.'
      );
      return;
    }

    // Check if subscription is active
    if (user.subscriptionStatus !== 'ACTIVE' && user.subscriptionStatus !== 'TRIALING') {
      logger.info(
        { userId: user.id, subscriptionStatus: user.subscriptionStatus },
        'Pro required: subscription not active'
      );
      problem(
        res,
        403,
        'Forbidden',
        'Your Pro subscription is not active. Please check your billing status.'
      );
      return;
    }

    // Attach user to request
    (req as Request & { user?: typeof user }).user = user;

    logger.debug({ userId: user.id }, 'Pro required: user authenticated and authorized');
    next();
    return;
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      logger.warn({ error }, 'Pro required: user not found');
      problem(res, 401, 'Unauthorized', 'User not found');
      return;
    }

    logger.error({ error }, 'Pro required: authorization failed');
    problem(res, 500, 'Internal Server Error', 'Authorization failed');
    return;
  }
}
