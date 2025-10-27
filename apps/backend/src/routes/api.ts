import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import { requirePro } from '../middleware/auth.js';
import type { SafeUser } from '../services/authService.js';

export const apiRouter = Router();

/**
 * Generate new API key for Pro user
 *
 * POST /api/api-keys/generate
 * Requires: Pro subscription
 * Body: {} (empty)
 * Returns: { apiKey, usage: { callsThisMonth, limit, resetAt } }
 *
 * Generates a new API key in format: pa_[32 random hex chars]
 * Replaces existing API key if one exists
 */
apiRouter.post('/generate', requirePro, async (req: Request, res: Response) => {
  const user = (req as Request & { user?: SafeUser }).user;

  if (!user) {
    return problem(res, 401, 'Unauthorized', 'User not authenticated');
  }

  try {
    // Generate new API key: pa_[32 hex chars]
    const randomBytes = crypto.randomBytes(16);
    const apiKey = `pa_${randomBytes.toString('hex')}`;

    // Set reset date to first of next month if not already set
    const now = new Date();
    const resetAt = user.apiResetAt && user.apiResetAt > now
      ? user.apiResetAt
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Update user with new API key
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        apiKey,
        apiResetAt: resetAt,
        // Reset counter when generating new key
        apiCallsMonth: 0,
      },
      select: {
        apiKey: true,
        apiCallsMonth: true,
        apiResetAt: true,
      },
    });

    logger.info(
      { userId: user.id, hasExistingKey: !!user.apiKey },
      'Generated new API key for user'
    );

    const API_LIMIT_PER_MONTH = 500;

    res.json({
      apiKey: updatedUser.apiKey,
      usage: {
        callsThisMonth: updatedUser.apiCallsMonth,
        limit: API_LIMIT_PER_MONTH,
        resetAt: updatedUser.apiResetAt,
      },
      warning: user.apiKey
        ? 'Your previous API key has been revoked. Update your applications with the new key.'
        : undefined,
    });
  } catch (error) {
    logger.error({ error, userId: user.id }, 'Failed to generate API key');
    return problem(res, 500, 'Internal Server Error', 'Failed to generate API key');
  }
});

/**
 * Get current API key and usage statistics
 *
 * GET /api/api-keys/usage
 * Requires: Pro subscription
 * Returns: { apiKey, usage: { callsThisMonth, limit, resetAt } }
 */
apiRouter.get('/usage', requirePro, async (req: Request, res: Response) => {
  const user = (req as Request & { user?: SafeUser }).user;

  if (!user) {
    return problem(res, 401, 'Unauthorized', 'User not authenticated');
  }

  try {
    // Fetch latest user data
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        apiKey: true,
        apiCallsMonth: true,
        apiResetAt: true,
      },
    });

    if (!userData) {
      return problem(res, 404, 'Not Found', 'User not found');
    }

    const API_LIMIT_PER_MONTH = 500;

    // Check if we need to reset counter
    const now = new Date();
    const resetAt = userData.apiResetAt;

    if (resetAt && now > resetAt) {
      // Counter should be reset
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          apiCallsMonth: 0,
          apiResetAt: nextReset,
        },
      });

      userData.apiCallsMonth = 0;
      userData.apiResetAt = nextReset;
    }

    res.json({
      apiKey: userData.apiKey,
      hasApiKey: !!userData.apiKey,
      usage: {
        callsThisMonth: userData.apiCallsMonth,
        limit: API_LIMIT_PER_MONTH,
        remaining: Math.max(0, API_LIMIT_PER_MONTH - userData.apiCallsMonth),
        resetAt: userData.apiResetAt,
      },
    });
  } catch (error) {
    logger.error({ error, userId: user.id }, 'Failed to get API key usage');
    return problem(res, 500, 'Internal Server Error', 'Failed to get API key usage');
  }
});

/**
 * Revoke API key
 *
 * DELETE /api/api-keys/revoke
 * Requires: Pro subscription
 * Returns: { success: true }
 */
apiRouter.delete('/revoke', requirePro, async (req: Request, res: Response) => {
  const user = (req as Request & { user?: SafeUser }).user;

  if (!user) {
    return problem(res, 401, 'Unauthorized', 'User not authenticated');
  }

  try {
    if (!user.apiKey) {
      return problem(res, 400, 'Bad Request', 'No API key to revoke');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        apiKey: null,
      },
    });

    logger.info({ userId: user.id }, 'Revoked API key for user');

    res.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    logger.error({ error, userId: user.id }, 'Failed to revoke API key');
    return problem(res, 500, 'Internal Server Error', 'Failed to revoke API key');
  }
});
