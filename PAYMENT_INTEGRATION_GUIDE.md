# Payment Integration Guide

Complete guide for the highly customizable payment integration in Privacy Advisor, supporting multiple payment providers with feature flags.

## Overview

Privacy Advisor supports three payment methods for PRO subscriptions:
1. **LemonSqueezy** - Credit card payments with global tax compliance
2. **Stripe** - Credit card payments (preserved but disabled by default)
3. **Wallet Authentication** - Solana wallet with PRICKO token holdings

All payment methods can be independently enabled/disabled via feature flags, providing maximum flexibility.

---

## Architecture

### Service Layer Pattern

Both payment providers follow a consistent class-based service pattern:

```
apps/backend/src/services/
├── stripeService.ts          # Stripe payment handling
├── lemonsqueezyService.ts    # LemonSqueezy payment handling
└── walletAuthService.ts      # Solana wallet authentication
```

**Key Benefits:**
- Consistent API across providers
- Easy to test and mock
- Lazy initialization based on feature flags
- Centralized error handling

### Route Layer

```
apps/backend/src/routes/
├── stripe.ts           # Stripe endpoints
├── lemonsqueezy.ts     # LemonSqueezy endpoints
└── wallet.ts           # Wallet endpoints
```

**Common Endpoints:**
- `POST /api/{provider}/create-checkout` - Create payment session
- `POST /api/{provider}/webhook` - Handle provider webhooks
- `GET /api/{provider}/subscription` - Get subscription status

### Middleware

```
apps/backend/src/middleware/
└── paymentProvider.ts  # Feature flag checking
```

**Functions:**
- `requirePaymentProvider(provider)` - Ensures provider is enabled
- `getAvailableProviders()` - Returns enabled provider status
- `getRecommendedProvider()` - Suggests best available provider

---

## Feature Flag Configuration

### Environment Variables

```bash
# LemonSqueezy (Recommended - Global coverage)
LEMONSQUEEZY_ENABLED=true                          # Enable/disable
LEMONSQUEEZY_API_KEY=your_api_key                  # API key from dashboard
LEMONSQUEEZY_STORE_ID=your_store_id                # Store ID
LEMONSQUEEZY_VARIANT_ID=your_variant_id            # Product variant ID
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret    # Webhook signing secret

# Stripe (Preserved for future use)
STRIPE_ENABLED=false                               # Disabled by default
STRIPE_SECRET_KEY=sk_test_...                      # Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_...                 # Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_...                    # Webhook signing secret
STRIPE_PRICE_ID=price_...                          # Price ID for PRO tier

# Wallet Authentication
WALLET_AUTH_ENABLED=false                          # Disabled by default
WALLET_PRO_TOKEN_THRESHOLD=10000                   # Minimum PRICKO tokens for PRO
PRICKO_TOKEN_MINT=your_token_mint_address          # Token mint address
PRICKO_TOKEN_LAUNCHED=false                        # Set to true after token launch
```

### Configuration Object

All settings are centralized in `apps/backend/src/config.ts`:

```typescript
export const config = {
  payments: {
    stripe: {
      enabled: process.env.STRIPE_ENABLED === 'true',
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      priceId: process.env.STRIPE_PRICE_ID,
    },
    lemonsqueezy: {
      enabled: process.env.LEMONSQUEEZY_ENABLED === 'true',
      apiKey: process.env.LEMONSQUEEZY_API_KEY,
      storeId: process.env.LEMONSQUEEZY_STORE_ID,
      variantId: process.env.LEMONSQUEEZY_VARIANT_ID,
      webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
    },
    wallet: {
      enabled: process.env.WALLET_AUTH_ENABLED !== 'false',
      requiredTokens: parseNumber(process.env.WALLET_PRO_TOKEN_THRESHOLD, 10000),
    },
  },
};
```

---

## LemonSqueezy Integration

### Setup Steps

1. **Create LemonSqueezy Account**
   - Sign up at https://lemonsqueezy.com
   - Complete business verification
   - Configure tax settings (automatic tax compliance)

2. **Create Product**
   - Navigate to Products → New Product
   - Set up "Privacy Advisor PRO" subscription
   - Configure pricing: $4.99/month
   - Note the Variant ID

3. **Get API Credentials**
   - Settings → API
   - Create new API key
   - Note your Store ID
   - Copy API key (shown only once)

4. **Configure Webhook**
   - Settings → Webhooks → New Webhook
   - URL: `https://your-domain.com/api/lemonsqueezy/webhook`
   - Events: Select all subscription events
   - Copy webhook secret

5. **Update Environment**
   ```bash
   LEMONSQUEEZY_ENABLED=true
   LEMONSQUEEZY_API_KEY=<your_api_key>
   LEMONSQUEEZY_STORE_ID=<your_store_id>
   LEMONSQUEEZY_VARIANT_ID=<your_variant_id>
   LEMONSQUEEZY_WEBHOOK_SECRET=<your_webhook_secret>
   ```

### API Endpoints

#### Create Checkout Session
```http
POST /api/lemonsqueezy/create-checkout
Authorization: Bearer <jwt_token>

Response:
{
  "url": "https://checkout.lemonsqueezy.com/..."
}
```

#### Get Subscription Status
```http
GET /api/lemonsqueezy/subscription
Authorization: Bearer <jwt_token>

Response:
{
  "subscription": "PRO",
  "subscriptionStatus": "ACTIVE",
  "subscriptionEndsAt": "2025-11-21T00:00:00.000Z",
  "provider": "LEMONSQUEEZY",
  "hasActiveSubscription": true
}
```

#### Webhook Handler
```http
POST /api/lemonsqueezy/webhook
X-Signature: <hmac_signature>

Body: <webhook_payload>

Response:
{
  "received": true
}
```

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `subscription_created` | Grant PRO access, store subscription ID |
| `subscription_updated` | Update subscription end date |
| `subscription_cancelled` | Revoke PRO (unless wallet PRO exists) |
| `subscription_expired` | Revoke PRO (unless wallet PRO exists) |
| `subscription_payment_success` | Ensure subscription is active |
| `subscription_payment_failed` | Mark as PAST_DUE |
| `subscription_payment_recovered` | Restore ACTIVE status |

### Error Handling

| Error Code | HTTP | Meaning |
|------------|------|---------|
| `USER_NOT_FOUND` | 404 | User doesn't exist |
| `ALREADY_SUBSCRIBED` | 400 | User already has PRO |
| `LEMONSQUEEZY_CONFIG_INCOMPLETE` | 500 | Missing config (store/variant ID) |
| `CHECKOUT_CREATION_FAILED` | 500 | LemonSqueezy API error |
| `CHECKOUT_URL_MISSING` | 500 | No checkout URL in response |

---

## Stripe Integration (Preserved)

### Status

Stripe integration is **preserved but disabled** by default due to country restrictions. The code remains intact and can be re-enabled in the future.

### To Enable Stripe

1. Set `STRIPE_ENABLED=true`
2. Configure all Stripe environment variables
3. Restart backend service

### Endpoints

Same pattern as LemonSqueezy:
- `POST /api/stripe/create-checkout`
- `POST /api/stripe/create-portal` (manage subscription)
- `POST /api/stripe/webhook`
- `GET /api/stripe/subscription`

---

## Payment Provider Middleware

### Usage Examples

#### Require Specific Provider
```typescript
import { requirePaymentProvider } from '../middleware/paymentProvider.js';

router.post(
  '/checkout',
  requirePaymentProvider('lemonsqueezy'),
  requireAuth,
  async (req, res) => {
    // LemonSqueezy is guaranteed to be enabled here
  }
);
```

#### Require Any Provider
```typescript
router.post(
  '/upgrade',
  requirePaymentProvider('any'),
  requireAuth,
  async (req, res) => {
    // At least one payment provider is enabled
    const providers = getAvailableProviders();
    // Suggest best option to user
  }
);
```

### Helper Functions

```typescript
import {
  getAvailableProviders,
  getRecommendedProvider
} from '../middleware/paymentProvider.js';

// Get all provider statuses
const providers = getAvailableProviders();
// { stripe: false, lemonsqueezy: true, wallet: false }

// Get recommended provider (priority: LS > Stripe > Wallet)
const recommended = getRecommendedProvider();
// "lemonsqueezy"
```

---

## Database Schema

### User Model Fields

```prisma
model User {
  // Subscription tier
  subscription           SubscriptionTier    @default(FREE)
  subscriptionStatus     SubscriptionStatus? @default(INACTIVE)
  subscriptionEndsAt     DateTime?
  subscriptionProvider   PaymentProvider?

  // Stripe fields
  stripeCustomerId       String?   @unique
  stripeSubscriptionId   String?   @unique

  // LemonSqueezy fields
  lsCustomerId           String?   @unique
  lsSubscriptionId       String?   @unique

  // Wallet fields
  walletLink             WalletLink?
}

enum SubscriptionTier {
  FREE
  PRO
  TEAM
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  TRIALING
  INACTIVE
}

enum PaymentProvider {
  STRIPE
  LEMONSQUEEZY
  WALLET
}
```

---

## Dual PRO Access

Users can have PRO access from multiple sources simultaneously:

1. **Payment Provider (Stripe/LemonSqueezy)**
   - Recurring billing
   - Automatic renewal
   - Managed via customer portal

2. **Wallet Authentication**
   - Token-based eligibility
   - Checked on each login
   - No recurring billing

### Cancellation Logic

When a payment subscription is cancelled:
- Check if user has `walletLink`
- If yes: Keep PRO access (wallet-based)
- If no: Downgrade to FREE

This allows seamless transition between payment methods without losing PRO access.

---

## Testing

### Local Testing

1. **Use Test Mode Credentials**
   ```bash
   LEMONSQUEEZY_API_KEY=<test_mode_key>
   ```

2. **Test Webhooks with ngrok**
   ```bash
   ngrok http 5000
   # Update webhook URL to: https://xxx.ngrok.io/api/lemonsqueezy/webhook
   ```

3. **Test Checkout Flow**
   ```bash
   curl -X POST http://localhost:5000/api/lemonsqueezy/create-checkout \
     -H "Authorization: Bearer <jwt>" \
     -H "Content-Type: application/json"
   ```

### Production Testing

1. **Monitor Logs**
   ```bash
   docker logs privacy-advisor-backend-1 -f | grep -i lemonsqueezy
   ```

2. **Verify Webhook Delivery**
   - LemonSqueezy Dashboard → Webhooks → View Logs
   - Check signature verification
   - Confirm subscription status updates in database

3. **Test Cancellation Flow**
   - Create subscription
   - Cancel via LemonSqueezy dashboard
   - Verify user downgraded to FREE (or kept PRO if wallet exists)

---

## Monitoring & Debugging

### Important Logs

```typescript
// Initialization
'LemonSqueezy service initialized successfully'
'LemonSqueezy payment service is disabled via feature flag'

// Checkout
'Creating LemonSqueezy checkout session'
'LemonSqueezy checkout session created successfully'

// Webhooks
'Received verified LemonSqueezy webhook'
'Processing subscription_created'
'PRO access granted via LemonSqueezy'
'PRO access revoked'
```

### Common Issues

1. **Webhook Signature Fails**
   - Verify `LEMONSQUEEZY_WEBHOOK_SECRET` matches dashboard
   - Check raw body parser is applied before webhook endpoint
   - Ensure `X-Signature` header is present

2. **Checkout URL Missing**
   - Verify `LEMONSQUEEZY_STORE_ID` and `LEMONSQUEEZY_VARIANT_ID`
   - Check product variant is active in dashboard
   - Verify API key has correct permissions

3. **User Not Found in Webhook**
   - Check `custom_data.user_id` is passed correctly
   - Fallback to email-based user lookup
   - Verify user exists in database

---

## Migration Guide

### From Stripe to LemonSqueezy

1. **Enable LemonSqueezy**
   ```bash
   LEMONSQUEEZY_ENABLED=true
   STRIPE_ENABLED=false
   ```

2. **Update Frontend**
   - Point checkout buttons to `/api/lemonsqueezy/create-checkout`
   - Update subscription management links

3. **Handle Existing Stripe Users**
   - Stripe users keep PRO access
   - On next renewal failure, suggest LemonSqueezy
   - Provide migration path in customer portal

### Adding New Payment Provider

1. **Create Service Class**
   - Follow pattern in `lemonsqueezyService.ts`
   - Implement: `initialize()`, `createCheckoutSession()`, `handleWebhook()`

2. **Create Routes**
   - Follow pattern in `routes/lemonsqueezy.ts`
   - Add provider middleware check

3. **Update Config**
   - Add feature flag to `config.payments.<provider>`
   - Add environment variables

4. **Update Middleware**
   - Add provider to `getAvailableProviders()`
   - Update provider priority in `getRecommendedProvider()`

---

## Security Considerations

### Webhook Signature Verification

Both providers use HMAC SHA256:

```typescript
// LemonSqueezy
const hmac = crypto.createHmac('sha256', webhookSecret);
const digest = hmac.update(payload).digest('hex');
const valid = crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(digest)
);

// Stripe
const event = stripe.webhooks.constructEvent(
  payload,
  signature,
  webhookSecret
);
```

### API Key Security

- **Never commit secrets** to git
- Store in environment variables
- Use different keys for dev/stage/production
- Rotate keys regularly
- Use test mode keys for development

### CORS Configuration

```typescript
allowedHeaders: [
  'Authorization',      // JWT tokens
  'Stripe-Signature',   // Stripe webhooks
  'X-Signature',        // LemonSqueezy webhooks
]
```

---

## Files Modified/Created

### New Files
1. `apps/backend/src/services/lemonsqueezyService.ts` - LemonSqueezy service class
2. `apps/backend/src/middleware/paymentProvider.ts` - Payment provider middleware

### Modified Files
1. `apps/backend/src/routes/lemonsqueezy.ts` - Refactored to use service
2. `apps/backend/src/index.ts` - Service initialization
3. `apps/backend/src/server.ts` - Webhook raw body parser, CORS headers
4. `apps/backend/src/config.ts` - Payment configuration (already had structure)

### Redundant Files
- `apps/backend/src/lib/lemonsqueezy.ts` - Can be deleted (replaced by service)

---

## Deployment Checklist

### Pre-Deployment

- [ ] Set production LemonSqueezy API key
- [ ] Configure webhook URL with production domain
- [ ] Test webhook signature verification
- [ ] Verify product variant ID is correct
- [ ] Set appropriate feature flags

### Post-Deployment

- [ ] Test checkout flow end-to-end
- [ ] Verify webhook events are received
- [ ] Check subscription status updates in database
- [ ] Monitor error logs for issues
- [ ] Test cancellation flow

### Rollback Plan

If issues occur:
1. Set `LEMONSQUEEZY_ENABLED=false`
2. Re-enable Stripe if needed: `STRIPE_ENABLED=true`
3. Frontend will gracefully fallback to available providers

---

## Support & Documentation

- **LemonSqueezy Docs**: https://docs.lemonsqueezy.com
- **Stripe Docs**: https://stripe.com/docs
- **Internal Config**: `apps/backend/src/config.ts`
- **Service Code**: `apps/backend/src/services/lemonsqueezyService.ts`

---

**Last Updated**: 2025-10-21
**Status**: ✅ Production Ready
**Maintainer**: Privacy Advisor Team
