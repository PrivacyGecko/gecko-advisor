/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/

import { lemonSqueezySetup, createCheckout as lsCreateCheckout, type NewCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * Initialize LemonSqueezy SDK
 * Must be called before using any LemonSqueezy functions
 */
export function initializeLemonSqueezy() {
  if (!config.payments.lemonsqueezy.enabled) {
    logger.warn('LemonSqueezy is disabled');
    return;
  }

  if (!config.payments.lemonsqueezy.apiKey) {
    logger.error('LemonSqueezy API key not configured');
    throw new Error('LemonSqueezy API key is required');
  }

  lemonSqueezySetup({
    apiKey: config.payments.lemonsqueezy.apiKey,
    onError: (error) => {
      logger.error({ error }, 'LemonSqueezy SDK error');
    },
  });

  logger.info('LemonSqueezy SDK initialized');
}

/**
 * Create a checkout session for a user to subscribe to PRO
 */
export async function createLemonSqueezyCheckout(params: {
  userId: string;
  userEmail: string;
  successUrl?: string;
}) {
  const { userId, userEmail, successUrl } = params;

  logger.info({ userId, userEmail }, 'Creating LemonSqueezy checkout session');

  const storeId = config.payments.lemonsqueezy.storeId;
  const variantId = config.payments.lemonsqueezy.variantId;

  if (!storeId || !variantId) {
    throw new Error('LemonSqueezy store ID and variant ID must be configured');
  }

  // LemonSqueezy createCheckout API: createCheckout(storeId, variantId, options)
  const response = await lsCreateCheckout(
    storeId,
    Number.parseInt(variantId, 10),
    {
      checkoutData: {
        email: userEmail,
        custom: {
          user_id: userId,
        },
      },
      productOptions: {
        redirectUrl: successUrl || `${config.apiOrigin}/pricing?success=true`,
      },
    }
  );

  if (response.error) {
    logger.error({ error: response.error, userId }, 'Failed to create LemonSqueezy checkout');
    throw new Error('Failed to create checkout session');
  }

  const checkoutUrl = response.data?.data.attributes.url;

  if (!checkoutUrl) {
    logger.error({ response, userId }, 'No checkout URL in LemonSqueezy response');
    throw new Error('No checkout URL returned');
  }

  logger.info({ userId, checkoutUrl }, 'LemonSqueezy checkout session created successfully');

  return checkoutUrl;
}

/**
 * Verify LemonSqueezy webhook signature
 * This ensures the webhook is actually from LemonSqueezy
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const webhookSecret = config.payments.lemonsqueezy.webhookSecret;

  if (!webhookSecret) {
    logger.error('LemonSqueezy webhook secret not configured');
    return false;
  }

  // LemonSqueezy uses HMAC SHA256 for webhook signatures
  const crypto = require('node:crypto');
  const hmac = crypto.createHmac('sha256', webhookSecret);
  const digest = hmac.update(payload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
