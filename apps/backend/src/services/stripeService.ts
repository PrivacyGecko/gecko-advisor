import Stripe from 'stripe';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../logger.js';

/**
 * Stripe service for handling subscription payments and lifecycle management
 *
 * Features:
 * - Create checkout sessions for Pro subscriptions ($4.99/month)
 * - Handle webhook events for subscription lifecycle
 * - Manage customer portal sessions for subscription management
 * - Sync subscription status with database
 */
export class StripeService {
  private stripe: Stripe;

  constructor(private prisma: PrismaClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-09-30.clover',
      typescript: true,
    });

    logger.info('Stripe service initialized');
  }

  /**
   * Create a Stripe checkout session for Pro subscription
   *
   * @param userId User ID from database
   * @param email User's email address
   * @returns Stripe checkout session with URL for redirect
   */
  async createCheckoutSession(userId: string, email: string): Promise<Stripe.Checkout.Session> {
    try {
      // Check if user already has a Stripe customer ID
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true, subscription: true, subscriptionStatus: true },
      });

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Prevent duplicate active subscriptions
      if (
        user.subscription === 'PRO' &&
        (user.subscriptionStatus === 'ACTIVE' || user.subscriptionStatus === 'TRIALING')
      ) {
        throw new Error('ALREADY_SUBSCRIBED');
      }

      const priceId = process.env.STRIPE_PRICE_ID;
      if (!priceId) {
        throw new Error('STRIPE_PRICE_ID environment variable is required');
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      // Create or reuse Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email,
          metadata: {
            userId,
          },
        });
        customerId = customer.id;

        // Store customer ID in database
        await this.prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId },
        });

        logger.info({ userId, customerId }, 'Created new Stripe customer');
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${frontendUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/pricing?canceled=true`,
        metadata: {
          userId,
        },
        // Enable customer to manage subscription after purchase
        subscription_data: {
          metadata: {
            userId,
          },
        },
      });

      logger.info(
        { userId, sessionId: session.id, customerId },
        'Created Stripe checkout session'
      );

      return session;
    } catch (error) {
      if (error instanceof Error) {
        logger.error({ error: error.message, userId }, 'Failed to create checkout session');
      }
      throw error;
    }
  }

  /**
   * Handle incoming Stripe webhook events
   *
   * @param event Stripe webhook event
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    logger.info({ eventType: event.type, eventId: event.id }, 'Processing Stripe webhook');

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        default:
          logger.debug({ eventType: event.type }, 'Unhandled webhook event type');
      }
    } catch (error) {
      logger.error(
        { error, eventType: event.type, eventId: event.id },
        'Failed to process webhook event'
      );
      throw error;
    }
  }

  /**
   * Handle checkout.session.completed event
   * User completed payment, activate Pro subscription
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const subscriptionId = session.subscription as string;

    if (!userId) {
      logger.warn({ sessionId: session.id }, 'Checkout session missing userId metadata');
      return;
    }

    if (!subscriptionId) {
      logger.warn({ sessionId: session.id }, 'Checkout session missing subscription ID');
      return;
    }

    try {
      // Get subscription details to determine period end
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      const periodEnd = (subscription as any).current_period_end;

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscription: 'PRO',
          subscriptionStatus: subscription.status === 'trialing' ? 'TRIALING' : 'ACTIVE',
          stripeSubscriptionId: subscriptionId,
          subscriptionEndsAt: periodEnd ? new Date(periodEnd * 1000) : new Date(),
        },
      });

      logger.info(
        { userId, subscriptionId, sessionId: session.id },
        'Activated Pro subscription after checkout'
      );
    } catch (error) {
      logger.error(
        { error, userId, sessionId: session.id },
        'Failed to activate subscription after checkout'
      );
      throw error;
    }
  }

  /**
   * Handle customer.subscription.updated event
   * Subscription status changed (renewed, canceled, past_due, etc.)
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      // Try to find user by subscription ID
      const user = await this.prisma.user.findUnique({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (!user) {
        logger.warn(
          { subscriptionId: subscription.id },
          'Subscription updated but no user found'
        );
        return;
      }

      return this.updateSubscriptionStatus(user.id, subscription);
    }

    await this.updateSubscriptionStatus(userId, subscription);
  }

  /**
   * Handle customer.subscription.deleted event
   * Subscription was canceled or expired
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      // Try to find user by subscription ID
      const user = await this.prisma.user.findUnique({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (!user) {
        logger.warn(
          { subscriptionId: subscription.id },
          'Subscription deleted but no user found'
        );
        return;
      }

      return this.updateSubscriptionStatus(user.id, subscription);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscription: 'FREE',
        subscriptionStatus: 'CANCELED',
        subscriptionEndsAt: new Date(subscription.ended_at! * 1000),
      },
    });

    logger.info({ userId, subscriptionId: subscription.id }, 'Downgraded user to FREE tier');
  }

  /**
   * Handle invoice.payment_failed event
   * Payment failed, mark subscription as past due
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionRef = (invoice as any).subscription;
    const subscriptionId = typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id;

    if (!subscriptionId) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!user) {
      logger.warn({ subscriptionId }, 'Payment failed but no user found');
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'PAST_DUE',
      },
    });

    logger.warn(
      { userId: user.id, subscriptionId, invoiceId: invoice.id },
      'Marked subscription as past due after payment failure'
    );
  }

  /**
   * Handle invoice.payment_succeeded event
   * Payment succeeded, ensure subscription is active
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionRef = (invoice as any).subscription;
    const subscriptionId = typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id;

    if (!subscriptionId) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!user) {
      return;
    }

    // Get latest subscription status
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    await this.updateSubscriptionStatus(user.id, subscription);

    logger.info(
      { userId: user.id, subscriptionId, invoiceId: invoice.id },
      'Updated subscription after successful payment'
    );
  }

  /**
   * Update user subscription status based on Stripe subscription
   */
  private async updateSubscriptionStatus(
    userId: string,
    subscription: Stripe.Subscription
  ): Promise<void> {
    // Map Stripe status to our SubscriptionStatus enum
    let subscriptionStatus: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' | 'INACTIVE';

    switch (subscription.status) {
      case 'active':
        subscriptionStatus = 'ACTIVE';
        break;
      case 'trialing':
        subscriptionStatus = 'TRIALING';
        break;
      case 'past_due':
        subscriptionStatus = 'PAST_DUE';
        break;
      case 'canceled':
      case 'unpaid':
        subscriptionStatus = 'CANCELED';
        break;
      default:
        subscriptionStatus = 'INACTIVE';
    }

    // Determine subscription tier
    const subscriptionTier =
      subscription.status === 'active' || subscription.status === 'trialing' ? 'PRO' : 'FREE';

    const periodEnd = (subscription as any).current_period_end;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscription: subscriptionTier,
        subscriptionStatus,
        subscriptionEndsAt: periodEnd ? new Date(periodEnd * 1000) : new Date(),
      },
    });

    logger.info(
      { userId, subscriptionId: subscription.id, status: subscriptionStatus },
      'Updated subscription status'
    );
  }

  /**
   * Create a customer portal session for managing subscription
   *
   * @param customerId Stripe customer ID
   * @returns Stripe billing portal session with URL for redirect
   */
  async createPortalSession(customerId: string): Promise<Stripe.BillingPortal.Session> {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${frontendUrl}/dashboard`,
      });

      logger.info({ customerId, sessionId: session.id }, 'Created customer portal session');

      return session;
    } catch (error) {
      logger.error({ error, customerId }, 'Failed to create customer portal session');
      throw error;
    }
  }

  /**
   * Verify Stripe webhook signature
   *
   * @param payload Raw request body
   * @param signature Stripe signature header
   * @returns Parsed Stripe event
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      logger.error({ error }, 'Failed to verify webhook signature');
      throw new Error('INVALID_SIGNATURE');
    }
  }
}
