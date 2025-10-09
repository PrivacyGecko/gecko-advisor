import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import { requireAuth } from '../middleware/auth.js';
import { StripeService } from '../services/stripeService.js';
import type { SafeUser } from '../services/authService.js';

export const stripeRouter = Router();

// Initialize Stripe service
const stripeService = new StripeService(prisma);

/**
 * Create checkout session for Pro subscription
 *
 * POST /api/stripe/create-checkout
 * Requires: Authentication
 * Body: { } (empty - user info comes from token)
 * Returns: { url: string, sessionId: string }
 */
stripeRouter.post('/create-checkout', requireAuth, async (req: Request, res: Response) => {
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
        'You already have an active Pro subscription. Use the customer portal to manage it.'
      );
    }

    // Create checkout session
    const session = await stripeService.createCheckoutSession(user.id, user.email);

    logger.info(
      { userId: user.id, sessionId: session.id },
      'Created checkout session for user'
    );

    res.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'USER_NOT_FOUND') {
        return problem(res, 404, 'Not Found', 'User not found');
      }
      if (error.message === 'ALREADY_SUBSCRIBED') {
        return problem(res, 400, 'Bad Request', 'Already subscribed to Pro');
      }
      if (error.message.includes('STRIPE_')) {
        return problem(res, 500, 'Internal Server Error', 'Stripe configuration error');
      }

      logger.error({ error: error.message, userId: (req as any).user?.id }, 'Checkout error');
    }

    return problem(res, 500, 'Internal Server Error', 'Failed to create checkout session');
  }
});

/**
 * Create customer portal session
 *
 * POST /api/stripe/create-portal
 * Requires: Authentication + Pro subscription
 * Returns: { url: string }
 */
stripeRouter.post('/create-portal', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user?: SafeUser }).user;

    if (!user) {
      return problem(res, 401, 'Unauthorized', 'User not authenticated');
    }

    // Check if user has a Stripe customer ID
    if (!user.stripeCustomerId) {
      return problem(
        res,
        400,
        'Bad Request',
        'No Stripe customer found. Please subscribe first.'
      );
    }

    // Create portal session
    const session = await stripeService.createPortalSession(user.stripeCustomerId);

    logger.info(
      { userId: user.id, sessionId: session.id },
      'Created customer portal session for user'
    );

    res.json({
      url: session.url,
    });
  } catch (error) {
    logger.error({ error, userId: (req as any).user?.id }, 'Portal session error');
    return problem(res, 500, 'Internal Server Error', 'Failed to create portal session');
  }
});

/**
 * Stripe webhook endpoint
 *
 * POST /api/stripe/webhook
 * Public endpoint - validates signature
 * Handles: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 * Returns: { received: true }
 */
stripeRouter.post(
  '/webhook',
  // Use raw body parser for webhook signature verification
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      logger.warn({ headers: req.headers }, 'Webhook missing stripe-signature header');
      return problem(res, 400, 'Bad Request', 'Missing stripe-signature header');
    }

    try {
      // Get raw body for signature verification
      // Note: This requires express.raw() middleware to be configured for this route
      const payload = (req as any).rawBody || req.body;

      if (!payload) {
        logger.error('Webhook missing raw body');
        return problem(res, 400, 'Bad Request', 'Missing request body');
      }

      // Verify webhook signature and construct event
      const event = stripeService.verifyWebhookSignature(payload, signature);

      logger.info(
        { eventType: event.type, eventId: event.id },
        'Received verified Stripe webhook'
      );

      // Handle webhook event asynchronously
      // Don't await to respond quickly to Stripe
      stripeService.handleWebhook(event).catch((error) => {
        logger.error(
          { error, eventType: event.type, eventId: event.id },
          'Error handling webhook event'
        );
      });

      // Acknowledge receipt immediately
      res.json({ received: true });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'INVALID_SIGNATURE') {
          logger.warn({ error: error.message }, 'Invalid webhook signature');
          return problem(res, 401, 'Unauthorized', 'Invalid webhook signature');
        }

        logger.error({ error: error.message }, 'Webhook processing error');
      }

      return problem(res, 500, 'Internal Server Error', 'Failed to process webhook');
    }
  }
);

/**
 * Get subscription status
 *
 * GET /api/stripe/subscription
 * Requires: Authentication
 * Returns: { subscription, subscriptionStatus, subscriptionEndsAt }
 */
stripeRouter.get('/subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user?: SafeUser }).user;

    if (!user) {
      return problem(res, 401, 'Unauthorized', 'User not authenticated');
    }

    res.json({
      subscription: user.subscription,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEndsAt: user.subscriptionEndsAt,
      hasActiveSubscription:
        (user.subscription === 'PRO' || user.subscription === 'TEAM') &&
        (user.subscriptionStatus === 'ACTIVE' || user.subscriptionStatus === 'TRIALING'),
    });
  } catch (error) {
    logger.error({ error, userId: (req as any).user?.id }, 'Failed to get subscription status');
    return problem(res, 500, 'Internal Server Error', 'Failed to get subscription status');
  }
});
