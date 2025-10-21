/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePaymentProvider } from '../middleware/paymentProvider.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import { prisma } from '../prisma.js';
import { LemonSqueezyService } from '../services/lemonsqueezyService.js';
import type { SafeUser } from '../services/authService.js';
import type { LemonSqueezyEvent } from '../services/lemonsqueezyService.js';

export const lemonsqueezyRouter = Router();

// Initialize LemonSqueezy service
const lemonSqueezyService = new LemonSqueezyService(prisma);

/**
 * Create checkout session for Pro subscription
 *
 * POST /api/lemonsqueezy/create-checkout
 * Requires: Authentication, LemonSqueezy enabled
 * Body: { successUrl?: string } (optional redirect URL after successful checkout)
 * Returns: { url: string }
 */
lemonsqueezyRouter.post(
  '/create-checkout',
  requirePaymentProvider('lemonsqueezy'),
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = (req as Request & { user?: SafeUser }).user;

      if (!user) {
        return problem(res, 401, 'Unauthorized', 'User not authenticated');
      }

      // Check if user already has an active Pro subscription
      if (
        (user.subscription === 'PRO' || user.subscription === 'TEAM') &&
        (user.subscriptionStatus === 'ACTIVE' || user.subscriptionStatus === 'TRIALING')
      ) {
        return problem(
          res,
          400,
          'Bad Request',
          'You already have an active Pro subscription. Manage your subscription through the customer portal.'
        );
      }

      // Extract optional success URL from request body
      const successUrl = req.body?.successUrl;

      // Create checkout session via service
      const checkoutUrl = await lemonSqueezyService.createCheckoutSession(
        user.id,
        user.email,
        successUrl
      );

      logger.info({ userId: user.id }, 'Created LemonSqueezy checkout session for user');

      res.json({
        url: checkoutUrl,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'USER_NOT_FOUND') {
          return problem(res, 404, 'Not Found', 'User not found');
        }
        if (error.message === 'ALREADY_SUBSCRIBED') {
          return problem(res, 400, 'Bad Request', 'Already subscribed to Pro');
        }
        if (error.message === 'LEMONSQUEEZY_CONFIG_INCOMPLETE') {
          logger.error('LemonSqueezy configuration incomplete');
          return problem(res, 500, 'Internal Server Error', 'Payment service configuration error');
        }
        if (error.message.includes('LEMONSQUEEZY_') || error.message.includes('CHECKOUT_')) {
          return problem(res, 500, 'Internal Server Error', 'Payment service error');
        }

        logger.error({ error: error.message, userId: (req as Request & { user?: SafeUser }).user?.id }, 'Checkout error');
      }

      return problem(res, 500, 'Internal Server Error', 'Failed to create checkout session');
    }
  }
);

/**
 * LemonSqueezy webhook endpoint
 *
 * POST /api/lemonsqueezy/webhook
 * Public endpoint - validates signature
 * Handles: subscription lifecycle events (created, updated, cancelled, payment events)
 * Returns: { received: true }
 */
lemonsqueezyRouter.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-signature'];

  if (!signature || typeof signature !== 'string') {
    logger.warn({ headers: req.headers }, 'Webhook missing x-signature header');
    return problem(res, 400, 'Bad Request', 'Missing x-signature header');
  }

  try {
    // Get raw body for signature verification
    // Note: This requires express.raw() middleware to be configured for this route
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    const payload = rawBody ? rawBody.toString('utf-8') : JSON.stringify(req.body);

    if (!payload) {
      logger.error('Webhook missing raw body');
      return problem(res, 400, 'Bad Request', 'Missing request body');
    }

    // Verify webhook signature
    const isValid = lemonSqueezyService.verifyWebhookSignature(payload, signature);

    if (!isValid) {
      logger.warn('Invalid LemonSqueezy webhook signature');
      return problem(res, 401, 'Unauthorized', 'Invalid webhook signature');
    }

    // Parse event from body
    const event = typeof payload === 'string' ? JSON.parse(payload) : req.body;

    logger.info(
      { eventType: event.meta?.event_name, eventId: event.data?.id },
      'Received verified LemonSqueezy webhook'
    );

    // Handle webhook event asynchronously
    // Don't await to respond quickly to LemonSqueezy
    lemonSqueezyService.handleWebhook(event as LemonSqueezyEvent).catch((error) => {
      logger.error(
        { error, eventType: event.meta?.event_name, eventId: event.data?.id },
        'Error handling webhook event'
      );
    });

    // Acknowledge receipt immediately
    res.json({ received: true });
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ error: error.message }, 'Webhook processing error');
    }

    return problem(res, 500, 'Internal Server Error', 'Failed to process webhook');
  }
});

/**
 * Get subscription status
 *
 * GET /api/lemonsqueezy/subscription
 * Requires: Authentication
 * Returns: { subscription, subscriptionStatus, subscriptionEndsAt, provider, hasActiveSubscription }
 */
lemonsqueezyRouter.get(
  '/subscription',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = (req as Request & { user?: SafeUser }).user;

      if (!user) {
        return problem(res, 401, 'Unauthorized', 'User not authenticated');
      }

      const status = await lemonSqueezyService.getSubscriptionStatus(user.id);

      res.json(status);
    } catch (error) {
      if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
        return problem(res, 404, 'Not Found', 'User not found');
      }

      logger.error({ error, userId: (req as Request & { user?: SafeUser }).user?.id }, 'Failed to get subscription status');
      return problem(res, 500, 'Internal Server Error', 'Failed to get subscription status');
    }
  }
);
