/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';

/**
 * Payment provider types supported by the application
 */
export type PaymentProvider = 'stripe' | 'lemonsqueezy' | 'any';

/**
 * Payment provider requirement middleware
 *
 * Checks if a specific payment provider is enabled before allowing access to routes
 * Returns 503 Service Unavailable if the provider is disabled
 *
 * @param provider - The payment provider to check ('stripe', 'lemonsqueezy', or 'any')
 * @returns Express middleware function
 *
 * @example
 * // Require Stripe to be enabled
 * stripeRouter.post('/create-checkout', requirePaymentProvider('stripe'), requireAuth, handler);
 *
 * @example
 * // Allow any payment provider
 * router.post('/checkout', requirePaymentProvider('any'), requireAuth, handler);
 */
export function requirePaymentProvider(provider: PaymentProvider) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const stripeEnabled = config.payments.stripe.enabled;
    const lemonSqueezyEnabled = config.payments.lemonsqueezy.enabled;
    const walletEnabled = config.payments.wallet.enabled;

    // Check if specific provider is enabled
    switch (provider) {
      case 'stripe':
        if (!stripeEnabled) {
          logger.warn(
            { url: req.url, provider: 'stripe' },
            'Payment provider required but disabled'
          );

          // Build helpful error message based on what's available
          const availableMethods = [];
          if (lemonSqueezyEnabled) {
            availableMethods.push('credit card payments via LemonSqueezy');
          }
          if (walletEnabled) {
            availableMethods.push('wallet authentication');
          }

          const message =
            availableMethods.length > 0
              ? `Stripe payments are currently unavailable. Please use ${availableMethods.join(' or ')}.`
              : 'Payment processing is currently unavailable. Please contact support.';

          problem(res, 503, 'Service Unavailable', message);
          return;
        }
        break;

      case 'lemonsqueezy':
        if (!lemonSqueezyEnabled) {
          logger.warn(
            { url: req.url, provider: 'lemonsqueezy' },
            'Payment provider required but disabled'
          );

          // Build helpful error message based on what's available
          const availableMethods = [];
          if (stripeEnabled) {
            availableMethods.push('Stripe');
          }
          if (walletEnabled) {
            availableMethods.push('wallet authentication');
          }

          const message =
            availableMethods.length > 0
              ? `Credit card payments are currently unavailable. Please use ${availableMethods.join(' or ')}.`
              : 'Payment processing is currently unavailable. Please contact support.';

          problem(res, 503, 'Service Unavailable', message);
          return;
        }
        break;

      case 'any':
        // At least one payment method must be enabled
        if (!stripeEnabled && !lemonSqueezyEnabled && !walletEnabled) {
          logger.error(
            { url: req.url },
            'No payment providers enabled - all payment methods are disabled'
          );
          problem(
            res,
            503,
            'Service Unavailable',
            'Payment processing is currently unavailable. Please contact support.'
          );
          return;
        }
        break;

      default:
        logger.error({ provider }, 'Invalid payment provider specified');
        problem(res, 500, 'Internal Server Error', 'Invalid payment provider configuration');
        return;
    }

    // Provider is enabled, continue
    logger.debug({ provider, url: req.url }, 'Payment provider check passed');
    next();
  };
}

/**
 * Get available payment providers
 *
 * Utility function to determine which payment methods are currently available
 * Useful for frontend to show/hide payment options
 *
 * @returns Object with boolean flags for each provider
 */
export function getAvailableProviders() {
  return {
    stripe: config.payments.stripe.enabled,
    lemonsqueezy: config.payments.lemonsqueezy.enabled,
    wallet: config.payments.wallet.enabled,
  };
}

/**
 * Get recommended payment provider
 *
 * Returns the recommended payment provider based on availability
 * Priority: LemonSqueezy > Stripe > Wallet
 *
 * @returns Recommended payment provider or null if none available
 */
export function getRecommendedProvider(): PaymentProvider | null {
  if (config.payments.lemonsqueezy.enabled) {
    return 'lemonsqueezy';
  }
  if (config.payments.stripe.enabled) {
    return 'stripe';
  }
  if (config.payments.wallet.enabled) {
    // Wallet is not a traditional payment provider but can grant PRO access
    return 'any';
  }
  return null;
}
