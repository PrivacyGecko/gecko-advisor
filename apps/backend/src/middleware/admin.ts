import { timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Admin authentication guard with timing-safe comparison to prevent timing attacks.
 * Uses crypto.timingSafeEqual to compare the provided API key with the expected key.
 */
export function adminGuard(req: Request, res: Response, next: NextFunction) {
  const providedKey = req.header('X-Admin-Key');
  const expectedKey = process.env.ADMIN_API_KEY;

  // Ensure both keys are present and are strings
  if (!providedKey || !expectedKey || typeof providedKey !== 'string' || typeof expectedKey !== 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Convert strings to buffers for timing-safe comparison
    const providedBuffer = Buffer.from(providedKey, 'utf8');
    const expectedBuffer = Buffer.from(expectedKey, 'utf8');

    // Ensure buffers are the same length to prevent length-based timing attacks
    if (providedBuffer.length !== expectedBuffer.length) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Use timing-safe comparison
    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
  } catch (error) {
    // Log error for debugging but don't expose details
    console.error('Admin authentication error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
