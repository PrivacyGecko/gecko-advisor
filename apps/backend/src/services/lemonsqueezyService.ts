/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/

import {
  lemonSqueezySetup,
  createCheckout,
} from '@lemonsqueezy/lemonsqueezy.js';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../logger.js';
import { config } from '../config.js';
import crypto from 'node:crypto';

/**
 * LemonSqueezy Event Types
 * See: https://docs.lemonsqueezy.com/api/webhooks#event-types
 */
export type LemonSqueezyEvent = {
  meta: {
    event_name:
      | 'subscription_created'
      | 'subscription_updated'
      | 'subscription_cancelled'
      | 'subscription_expired'
      | 'subscription_payment_success'
      | 'subscription_payment_failed'
      | 'subscription_payment_recovered'
      | 'subscription_payment_refunded';
    custom_data?: {
      user_id?: string;
    };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      store_id: number;
      customer_id: number;
      order_id: number;
      user_name: string;
      user_email: string;
      status: string;
      status_formatted: string;
      card_brand: string;
      card_last_four: string;
      pause: null | unknown;
      cancelled: boolean;
      trial_ends_at: string | null;
      billing_anchor: number;
      first_subscription_item: {
        id: number;
        subscription_id: number;
        price_id: number;
        quantity: number;
        is_usage_based: boolean;
        created_at: string;
        updated_at: string;
      };
      urls: {
        update_payment_method: string;
        customer_portal: string;
      };
      renews_at: string | null;
      ends_at: string | null;
      created_at: string;
      updated_at: string;
      test_mode: boolean;
    };
  };
};

/**
 * LemonSqueezy Service for handling subscription payments
 *
 * Features:
 * - Create checkout sessions for Pro subscriptions
 * - Handle webhook events for subscription lifecycle
 * - Manage subscription status sync with database
 * - Signature verification for webhooks
 * - Automatic initialization based on feature flags
 */
export class LemonSqueezyService {
  private initialized: boolean = false;

  constructor(private prisma: PrismaClient) {
    // Defer initialization until explicitly called or first use
  }

  /**
   * Initialize LemonSqueezy SDK
   * Must be called before using any LemonSqueezy functions
   */
  public initialize(): void {
    if (this.initialized) {
      logger.debug('LemonSqueezy SDK already initialized');
      return;
    }

    if (!config.payments.lemonsqueezy.enabled) {
      logger.warn('LemonSqueezy is disabled via feature flag');
      return;
    }

    const apiKey = config.payments.lemonsqueezy.apiKey;
    if (!apiKey) {
      logger.error('LemonSqueezy API key not configured');
      throw new Error('LEMONSQUEEZY_API_KEY environment variable is required');
    }

    lemonSqueezySetup({
      apiKey,
      onError: (error) => {
        logger.error({ error }, 'LemonSqueezy SDK error');
      },
    });

    this.initialized = true;
    logger.info('LemonSqueezy SDK initialized successfully');
  }

  /**
   * Ensure SDK is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }

  /**
   * Create a checkout session for a user to subscribe to PRO
   *
   * @param userId User ID from database
   * @param userEmail User's email address
   * @param successUrl Optional redirect URL after successful checkout
   * @returns Checkout URL for redirect
   */
  async createCheckoutSession(
    userId: string,
    userEmail: string,
    successUrl?: string
  ): Promise<string> {
    this.ensureInitialized();

    logger.info({ userId, userEmail }, 'Creating LemonSqueezy checkout session');

    // Validate user exists and doesn't have PRO
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscription: true, subscriptionStatus: true },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Prevent duplicate active subscriptions
    if (user.subscription === 'PRO' || user.subscription === 'TEAM') {
      throw new Error('ALREADY_SUBSCRIBED');
    }

    const storeId = config.payments.lemonsqueezy.storeId;
    const variantId = config.payments.lemonsqueezy.variantId;

    if (!storeId || !variantId) {
      throw new Error('LEMONSQUEEZY_CONFIG_INCOMPLETE');
    }

    try {
      // Create checkout session
      const response = await createCheckout(storeId, Number.parseInt(variantId, 10), {
        checkoutData: {
          email: userEmail,
          custom: {
            user_id: userId,
          },
        },
        productOptions: {
          redirectUrl:
            successUrl ??
            config.payments.lemonsqueezy.checkoutRedirectUrl ??
            `${config.apiOrigin}/dashboard?success=true`,
        },
      });

      if (response.error) {
        logger.error(
          { error: response.error, userId },
          'LemonSqueezy API returned error'
        );
        throw new Error('CHECKOUT_CREATION_FAILED');
      }

      const checkoutUrl = response.data?.data.attributes.url;

      if (!checkoutUrl) {
        logger.error({ response, userId }, 'No checkout URL in response');
        throw new Error('CHECKOUT_URL_MISSING');
      }

      logger.info(
        { userId, checkoutUrl },
        'LemonSqueezy checkout session created successfully'
      );

      return checkoutUrl;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('LEMONSQUEEZY_')) {
        throw error;
      }
      logger.error({ error, userId }, 'Failed to create checkout session');
      throw new Error('CHECKOUT_CREATION_FAILED');
    }
  }

  /**
   * Verify LemonSqueezy webhook signature
   * Uses HMAC SHA256 for verification
   *
   * @param payload Raw request body as string
   * @param signature Signature from X-Signature header
   * @returns True if signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const webhookSecret = config.payments.lemonsqueezy.webhookSecret;

    if (!webhookSecret) {
      logger.error('LemonSqueezy webhook secret not configured');
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = hmac.update(payload).digest('hex');

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
    } catch (error) {
      logger.error({ error }, 'Failed to verify webhook signature');
      return false;
    }
  }

  /**
   * Handle incoming LemonSqueezy webhook events
   *
   * @param event LemonSqueezy webhook event
   */
  async handleWebhook(event: LemonSqueezyEvent): Promise<void> {
    const eventName = event.meta.event_name;

    logger.info(
      { eventName, eventId: event.data.id },
      'Processing LemonSqueezy webhook'
    );

    try {
      switch (eventName) {
        case 'subscription_created':
          await this.handleSubscriptionCreated(event);
          break;

        case 'subscription_updated':
          await this.handleSubscriptionUpdated(event);
          break;

        case 'subscription_cancelled':
        case 'subscription_expired':
          await this.handleSubscriptionCancelled(event);
          break;

        case 'subscription_payment_success':
          await this.handlePaymentSuccess(event);
          break;

        case 'subscription_payment_failed':
          await this.handlePaymentFailed(event);
          break;

        case 'subscription_payment_recovered':
          await this.handlePaymentRecovered(event);
          break;

        default:
          logger.debug({ eventName }, 'Unhandled webhook event type');
      }
    } catch (error) {
      logger.error(
        { error, eventName, eventId: event.data.id },
        'Failed to process webhook event'
      );
      throw error;
    }
  }

  /**
   * Handle subscription_created event
   * Grant PRO access to the user
   */
  private async handleSubscriptionCreated(event: LemonSqueezyEvent): Promise<void> {
    const customData = event.meta.custom_data;
    const userId = customData?.user_id;
    const userEmail = event.data.attributes.user_email;
    const customerId = event.data.attributes.customer_id;
    const subscriptionId = event.data.id;
    const renewsAt = event.data.attributes.renews_at;

    logger.info({ userId, userEmail, subscriptionId }, 'Processing subscription_created');

    // Find user by ID or email
    const user = await this.prisma.user.findFirst({
      where: userId ? { id: userId } : { email: userEmail },
    });

    if (!user) {
      logger.error({ userId, userEmail }, 'User not found for subscription_created');
      return;
    }

    // Grant PRO access
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscription: 'PRO',
        subscriptionProvider: 'LEMONSQUEEZY',
        lsCustomerId: String(customerId),
        lsSubscriptionId: String(subscriptionId),
        subscriptionEndsAt: renewsAt ? new Date(renewsAt) : null,
        subscriptionStatus: 'ACTIVE',
      },
    });

    logger.info({ userId: user.id, subscriptionId }, 'PRO access granted via LemonSqueezy');
  }

  /**
   * Handle subscription_updated event
   * Update subscription details
   */
  private async handleSubscriptionUpdated(event: LemonSqueezyEvent): Promise<void> {
    const subscriptionId = event.data.id;
    const renewsAt = event.data.attributes.renews_at;
    const status = event.data.attributes.status;

    logger.info({ subscriptionId, status }, 'Processing subscription_updated');

    const user = await this.prisma.user.findFirst({
      where: { lsSubscriptionId: String(subscriptionId) },
    });

    if (!user) {
      logger.error({ subscriptionId }, 'User not found for subscription_updated');
      return;
    }

    // Update subscription details
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionEndsAt: renewsAt ? new Date(renewsAt) : null,
        subscriptionStatus: this.mapLemonSqueezyStatusToInternal(status),
      },
    });

    logger.info({ userId: user.id, subscriptionId }, 'Subscription updated');
  }

  /**
   * Handle subscription_cancelled/subscription_expired events
   * Revoke PRO access unless user has wallet-based PRO
   */
  private async handleSubscriptionCancelled(event: LemonSqueezyEvent): Promise<void> {
    const subscriptionId = event.data.id;
    const endsAt = event.data.attributes.ends_at;

    logger.info({ subscriptionId }, 'Processing subscription cancellation/expiration');

    const user = await this.prisma.user.findFirst({
      where: { lsSubscriptionId: String(subscriptionId) },
      include: { walletLink: true },
    });

    if (!user) {
      logger.error({ subscriptionId }, 'User not found for subscription cancellation');
      return;
    }

    // Check if user has wallet-based PRO access
    // If they do, don't downgrade (dual PRO access)
    if (user.walletLink) {
      logger.info({ userId: user.id }, 'User has wallet PRO access, not downgrading');
      return;
    }

    // Revoke PRO access
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscription: 'FREE',
        subscriptionProvider: null,
        subscriptionStatus: 'CANCELED',
        subscriptionEndsAt: endsAt ? new Date(endsAt) : null,
      },
    });

    logger.info({ userId: user.id, subscriptionId }, 'PRO access revoked');
  }

  /**
   * Handle subscription_payment_success event
   */
  private async handlePaymentSuccess(event: LemonSqueezyEvent): Promise<void> {
    const subscriptionId = event.data.id;
    logger.info({ subscriptionId }, 'Payment successful');

    // Update subscription status to ensure it's active
    const user = await this.prisma.user.findFirst({
      where: { lsSubscriptionId: String(subscriptionId) },
    });

    if (user && user.subscriptionStatus !== 'ACTIVE') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: 'ACTIVE' },
      });
    }
  }

  /**
   * Handle subscription_payment_failed event
   */
  private async handlePaymentFailed(event: LemonSqueezyEvent): Promise<void> {
    const subscriptionId = event.data.id;
    logger.error({ subscriptionId }, 'Payment failed - LemonSqueezy will retry');

    // Mark subscription as past due
    const user = await this.prisma.user.findFirst({
      where: { lsSubscriptionId: String(subscriptionId) },
    });

    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: 'PAST_DUE' },
      });
    }
  }

  /**
   * Handle subscription_payment_recovered event
   */
  private async handlePaymentRecovered(event: LemonSqueezyEvent): Promise<void> {
    const subscriptionId = event.data.id;
    logger.info({ subscriptionId }, 'Payment recovered after failure');

    // Restore active status
    const user = await this.prisma.user.findFirst({
      where: { lsSubscriptionId: String(subscriptionId) },
    });

    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: 'ACTIVE' },
      });
    }
  }

  /**
   * Map LemonSqueezy status to internal subscription status
   */
  private mapLemonSqueezyStatusToInternal(
    status: string
  ): 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' | 'INACTIVE' {
    switch (status.toLowerCase()) {
      case 'active':
        return 'ACTIVE';
      case 'on_trial':
        return 'TRIALING';
      case 'past_due':
        return 'PAST_DUE';
      case 'cancelled':
      case 'expired':
      case 'unpaid':
        return 'CANCELED';
      default:
        return 'INACTIVE';
    }
  }

  /**
   * Get subscription status for a user
   */
  async getSubscriptionStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscription: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        subscriptionProvider: true,
        lsSubscriptionId: true,
      },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return {
      subscription: user.subscription,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEndsAt: user.subscriptionEndsAt,
      provider: user.subscriptionProvider,
      hasActiveSubscription:
        (user.subscription === 'PRO' || user.subscription === 'TEAM') &&
        (user.subscriptionStatus === 'ACTIVE' || user.subscriptionStatus === 'TRIALING'),
    };
  }
}
