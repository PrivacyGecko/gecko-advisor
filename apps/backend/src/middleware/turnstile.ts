import type { NextFunction, Request, Response } from 'express';
import { turnstileService } from '../services/turnstileService.js';
import { problem } from '../problem.js';

type RequestWithTurnstile = Request & {
  turnstileVerified?: boolean;
};

function extractToken(req: Request): string | null {
  const bodyToken = typeof req.body?.turnstileToken === 'string' ? req.body.turnstileToken : null;
  const headerToken =
    (typeof req.headers['cf-turnstile-response'] === 'string' && req.headers['cf-turnstile-response']) ||
    (typeof req.headers['cf-visitor-token'] === 'string' && req.headers['cf-visitor-token']);

  return bodyToken ?? headerToken ?? null;
}

export async function requireTurnstile(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!turnstileService.isEnabled()) {
    (req as RequestWithTurnstile).turnstileVerified = true;
    return next();
  }

  const token = extractToken(req);
  if (!token) {
    problem(res, 400, 'Security Check Required');
    return;
  }

  const remoteIp =
    (typeof req.headers['cf-connecting-ip'] === 'string' && req.headers['cf-connecting-ip']) ||
    req.ip ||
    undefined;

  const userAgent = req.get('user-agent');

  const result = await turnstileService.verify({
    token,
    remoteIp,
    userAgent,
  });

  if (!result.success) {
    const detail = Array.isArray(result.errorCodes) ? result.errorCodes.join(', ') : undefined;
    problem(res, 400, 'Security Check Failed', detail ?? 'turnstile_verification_failed');
    return;
  }

  (req as RequestWithTurnstile).turnstileVerified = true;

  // Remove token to avoid accidentally persisting it downstream
  if (req.body && 'turnstileToken' in req.body) {
    delete (req.body as Record<string, unknown>).turnstileToken;
  }

  next();
}
