/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { problem } from '../problem.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { createLemonSqueezyCheckout, verifyWebhookSignature } from '../lib/lemonsqueezy.js';
import { prisma } from '../prisma.js';

export const lemonsqueezyRouter = Router();

/**
 * POST /api/lemonsqueezy/create-checkout
 * Create a LemonSqueezy checkout session for the authenticated user
 */
lemonsqueezyRouter.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    // Check if LemonSqueezy is enabled
    if (!config.payments.lemonsqueezy.enabled) {
      logger.warn('LemonSqueezy checkout requested but provider is disabled');
      return problem(res, 503, 'Credit card payments are temporarily unavailable. Please use wallet authentication or contact support.');
    }

    const userId = req.userId!;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return problem(res, 404, 'User not found');
    }

    // Check if user already has PRO
    if (user.subscription === 'PRO' || user.subscription === 'TEAM') {
      logger.info({ userId }, 'User already has PRO subscription');
      return problem(res, 400, 'You already have an active PRO subscription');
    }

    // Create checkout session
    const checkoutUrl = await createLemonSqueezyCheckout({
      userId: user.id,
      userEmail: user.email,
      successUrl: req.body.successUrl,
    });

    logger.info({ userId, checkoutUrl }, 'LemonSqueezy checkout session created');

    res.json({ url: checkoutUrl });
  } catch (error) {
    logger.error({ error, userId: req.userId }, 'Failed to create LemonSqueezy checkout');
    return problem(res, 500, 'Failed to create checkout session. Please try again or contact support.');
  }
});

/**
 * POST /api/lemonsqueezy/webhook
 * Handle LemonSqueezy webhook events for subscription lifecycle
 */
lemonsqueezyRouter.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    if (!signature || !verifyWebhookSignature(payload, signature)) {
      logger.error('Invalid LemonSqueezy webhook signature');
      return problem(res, 401, 'Invalid webhook signature');
    }

    const event = req.body;
    const eventName = event.meta?.event_name;

    logger.info({ eventName, eventId: event.data?.id }, 'LemonSqueezy webhook received');

    switch (eventName) {
      case 'subscription_created':
        await handleSubscriptionCreated(event);
        break;

      case 'subscription_updated':
        await handleSubscriptionUpdated(event);
        break;

      case 'subscription_cancelled':
      case 'subscription_expired':
        await handleSubscriptionCancelled(event);
        break;

      case 'subscription_payment_success':
        await handlePaymentSuccess(event);
        break;

      case 'subscription_payment_failed':
        await handlePaymentFailed(event);
        break;

      default:
        logger.info({ eventName }, 'Unhandled LemonSqueezy webhook event');
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error({ error }, 'Error processing LemonSqueezy webhook');
    return problem(res, 500, 'Webhook processing failed');
  }
});

/**
 * Handle subscription_created event
 * Grant PRO access to the user
 */
async function handleSubscriptionCreated(event: any) {
  const customData = event.data.attributes.first_subscription_item?.custom_data;
  const userId = customData?.user_id;
  const userEmail = event.data.attributes.user_email;
  const customerId = event.data.attributes.customer_id;
  const subscriptionId = event.data.id;
  const renewsAt = event.data.attributes.renews_at;

  logger.info({ userId, userEmail, subscriptionId }, 'Processing subscription_created');

  // Find user by ID or email
  const user = await prisma.user.findFirst({
    where: userId ? { id: userId } : { email: userEmail },
  });

  if (!user) {
    logger.error({ userId, userEmail }, 'User not found for subscription_created event');
    return;
  }

  // Grant PRO access
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscription: 'PRO',
      subscriptionProvider: 'LEMONSQUEEZY',
      lsCustomerId: String(customerId),
      lsSubscriptionId: String(subscriptionId),
      subscriptionEndsAt: renewsAt ? new Date(renewsAt) : null,
    },
  });

  logger.info({ userId: user.id, subscriptionId }, 'PRO access granted via LemonSqueezy');
}

/**
 * Handle subscription_updated event
 * Update subscription details
 */
async function handleSubscriptionUpdated(event: any) {
  const subscriptionId = event.data.id;
  const renewsAt = event.data.attributes.renews_at;
  const status = event.data.attributes.status;

  logger.info({ subscriptionId, status }, 'Processing subscription_updated');

  const user = await prisma.user.findFirst({
    where: { lsSubscriptionId: String(subscriptionId) },
  });

  if (!user) {
    logger.error({ subscriptionId }, 'User not found for subscription_updated event');
    return;
  }

  // Update subscription end date
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionEndsAt: renewsAt ? new Date(renewsAt) : null,
    },
  });

  logger.info({ userId: user.id, subscriptionId }, 'Subscription updated');
}

/**
 * Handle subscription_cancelled/subscription_expired events
 * Revoke PRO access
 */
async function handleSubscriptionCancelled(event: any) {
  const subscriptionId = event.data.id;
  const endsAt = event.data.attributes.ends_at;

  logger.info({ subscriptionId }, 'Processing subscription cancellation/expiration');

  const user = await prisma.user.findFirst({
    where: { lsSubscriptionId: String(subscriptionId) },
    include: { walletLink: true }, // Include wallet link to check for wallet-based PRO
  });

  if (!user) {
    logger.error({ subscriptionId }, 'User not found for subscription cancellation event');
    return;
  }

  // Check if user has wallet-based PRO access
  // If they do, don't downgrade them (they have dual PRO access)
  if (user.walletLink) {
    logger.info({ userId: user.id }, 'User has wallet PRO access, not downgrading');
    return;
  }

  // Revoke PRO access
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscription: 'FREE',
      subscriptionProvider: null,
      subscriptionEndsAt: endsAt ? new Date(endsAt) : null,
    },
  });

  logger.info({ userId: user.id, subscriptionId }, 'PRO access revoked');
}

/**
 * Handle subscription_payment_success event
 * Log successful payment
 */
async function handlePaymentSuccess(event: any) {
  const subscriptionId = event.data.id;
  logger.info({ subscriptionId }, 'Payment successful');
}

/**
 * Handle subscription_payment_failed event
 * Log failed payment (LemonSqueezy handles dunning automatically)
 */
async function handlePaymentFailed(event: any) {
  const subscriptionId = event.data.id;
  logger.error({ subscriptionId }, 'Payment failed - LemonSqueezy will retry');
}
