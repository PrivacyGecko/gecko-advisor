# Stripe Integration & Pro Tier Features

Complete implementation guide for Stripe payment integration and Pro tier features in Privacy Advisor.

## Table of Contents

1. [Installation & Dependencies](#installation--dependencies)
2. [Environment Variables](#environment-variables)
3. [Stripe Setup](#stripe-setup)
4. [API Endpoints](#api-endpoints)
5. [Testing Guide](#testing-guide)
6. [Integration Checklist](#integration-checklist)

## Installation & Dependencies

### 1. Install Stripe SDK

```bash
pnpm add stripe
pnpm add -D @types/stripe
```

### 2. Install Additional Dependencies

The implementation uses `@paralleldrive/cuid2` for batch ID generation:

```bash
pnpm add @paralleldrive/cuid2
```

## Environment Variables

Add the following to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...                  # From Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_...                # From Stripe Webhook settings
STRIPE_PRICE_ID=price_...                      # Create in Stripe Dashboard for $4.99/month

# Frontend URL for redirects
FRONTEND_URL=http://localhost:5173             # Update for production
```

### Getting Stripe Keys

1. **Secret Key** (`STRIPE_SECRET_KEY`):
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Navigate to Developers → API Keys
   - Copy "Secret key" (starts with `sk_test_` for test mode)

2. **Webhook Secret** (`STRIPE_WEBHOOK_SECRET`):
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - URL: `https://your-api-domain.com/api/stripe/webhook`
   - Events to select:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.payment_succeeded`
   - Copy "Signing secret" (starts with `whsec_`)

3. **Price ID** (`STRIPE_PRICE_ID`):
   - Go to Products → Create product
   - Name: "Privacy Advisor Pro"
   - Description: "Pro subscription with unlimited scans and API access"
   - Pricing: $4.99/month (recurring)
   - Copy the Price ID (starts with `price_`)

## Stripe Setup

### Creating the Pro Subscription Product

1. Log into [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Add Product**
3. Configure the product:
   ```
   Name: Privacy Advisor Pro
   Description: Unlimited scans, batch scanning, API access, and private results
   Pricing Model: Recurring
   Price: $4.99 USD
   Billing Period: Monthly
   ```
4. Save and copy the **Price ID** (e.g., `price_1AbCdEfGhIjKlMnO`)

### Setting Up Webhooks

1. Navigate to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Configure:
   ```
   Endpoint URL: https://api.geckoadvisor.com/api/stripe/webhook
   Description: Privacy Advisor subscription events
   Events to send:
     ✓ checkout.session.completed
     ✓ customer.subscription.updated
     ✓ customer.subscription.deleted
     ✓ invoice.payment_failed
     ✓ invoice.payment_succeeded
   ```
4. Save and copy the **Webhook signing secret**

### Testing with Stripe CLI

For local development:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/stripe/webhook

# This will output a webhook signing secret for local testing
# Use this as STRIPE_WEBHOOK_SECRET in your .env
```

## API Endpoints

### 1. Create Checkout Session

**Endpoint:** `POST /api/stripe/create-checkout`

**Authentication:** Required (JWT token)

**Request:**
```bash
curl -X POST https://api.geckoadvisor.com/api/stripe/create-checkout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/...",
  "sessionId": "cs_test_..."
}
```

**Frontend Integration:**
```typescript
async function upgradeToPro() {
  const response = await fetch('/api/stripe/create-checkout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    }
  });

  const { url } = await response.json();

  // Redirect to Stripe Checkout
  window.location.href = url;
}
```

### 2. Create Customer Portal Session

**Endpoint:** `POST /api/stripe/create-portal`

**Authentication:** Required (JWT token)

**Request:**
```bash
curl -X POST https://api.geckoadvisor.com/api/stripe/create-portal \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

**Frontend Integration:**
```typescript
async function manageBilling() {
  const response = await fetch('/api/stripe/create-portal', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json'
    }
  });

  const { url } = await response.json();

  // Redirect to Stripe Customer Portal
  window.location.href = url;
}
```

### 3. Get Subscription Status

**Endpoint:** `GET /api/stripe/subscription`

**Authentication:** Required (JWT token)

**Request:**
```bash
curl https://api.geckoadvisor.com/api/stripe/subscription \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "subscription": "PRO",
  "subscriptionStatus": "ACTIVE",
  "subscriptionEndsAt": "2025-11-06T00:00:00.000Z",
  "hasActiveSubscription": true
}
```

### 4. Batch Scanning

**Endpoint:** `POST /api/scan/batch`

**Authentication:** Required (Pro subscription)

**Request:**
```bash
curl -X POST https://api.geckoadvisor.com/api/scan/batch \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com",
      "https://example.org",
      "https://example.net"
    ],
    "isPrivate": true
  }'
```

**Response:**
```json
{
  "batchId": "clx1234567890",
  "totalScans": 3,
  "scans": [
    {
      "scanId": "clx1111111111",
      "slug": "example-com-abc123",
      "url": "https://example.com"
    },
    {
      "scanId": "clx2222222222",
      "slug": "example-org-def456",
      "url": "https://example.org"
    },
    {
      "scanId": "clx3333333333",
      "slug": "example-net-ghi789",
      "url": "https://example.net"
    }
  ]
}
```

### 5. Batch Status

**Endpoint:** `GET /api/scan/batch/:batchId/status`

**Authentication:** Required (Pro subscription)

**Request:**
```bash
curl https://api.geckoadvisor.com/api/scan/batch/clx1234567890/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "batchId": "clx1234567890",
  "total": 3,
  "completed": 2,
  "failed": 0,
  "processing": 1,
  "queued": 0,
  "isComplete": false,
  "scans": [
    {
      "scanId": "clx1111111111",
      "slug": "example-com-abc123",
      "url": "https://example.com",
      "status": "done",
      "score": 85,
      "label": "Good",
      "createdAt": "2025-10-06T10:00:00.000Z",
      "finishedAt": "2025-10-06T10:00:15.000Z"
    },
    // ... more scans
  ]
}
```

### 6. Generate API Key

**Endpoint:** `POST /api/api-keys/generate`

**Authentication:** Required (Pro subscription)

**Request:**
```bash
curl -X POST https://api.geckoadvisor.com/api/api-keys/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "apiKey": "pa_0123456789abcdef0123456789abcdef",
  "usage": {
    "callsThisMonth": 0,
    "limit": 500,
    "resetAt": "2025-11-01T00:00:00.000Z"
  },
  "warning": "Your previous API key has been revoked. Update your applications with the new key."
}
```

### 7. API Key Usage

**Endpoint:** `GET /api/api-keys/usage`

**Authentication:** Required (Pro subscription)

**Request:**
```bash
curl https://api.geckoadvisor.com/api/api-keys/usage \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "apiKey": "pa_0123456789abcdef0123456789abcdef",
  "hasApiKey": true,
  "usage": {
    "callsThisMonth": 42,
    "limit": 500,
    "remaining": 458,
    "resetAt": "2025-11-01T00:00:00.000Z"
  }
}
```

### 8. Revoke API Key

**Endpoint:** `DELETE /api/api-keys/revoke`

**Authentication:** Required (Pro subscription)

**Request:**
```bash
curl -X DELETE https://api.geckoadvisor.com/api/api-keys/revoke \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

### 9. Scan History

**Endpoint:** `GET /api/scans/history`

**Authentication:** Required

**Request:**
```bash
curl https://api.geckoadvisor.com/api/scans/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "scans": [
    {
      "scanId": "clx1111111111",
      "slug": "example-com-abc123",
      "targetType": "url",
      "url": "https://example.com",
      "status": "done",
      "score": 85,
      "label": "Good",
      "isPublic": false,
      "isProScan": true,
      "source": "batch",
      "batchId": "clx1234567890",
      "createdAt": "2025-10-06T10:00:00.000Z",
      "finishedAt": "2025-10-06T10:00:15.000Z"
    }
  ],
  "total": 1,
  "daysBack": 90,
  "isPro": true,
  "cutoffDate": "2025-07-08T00:00:00.000Z"
}
```

## Testing Guide

### Test Stripe Integration

#### 1. Test Checkout Flow

```bash
# Get checkout URL
curl -X POST http://localhost:5000/api/stripe/create-checkout \
  -H "Authorization: Bearer YOUR_TEST_TOKEN" \
  -H "Content-Type: application/json"

# Use Stripe test card numbers:
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
# Requires 3DS: 4000 0025 0000 3155
```

#### 2. Test Webhooks Locally

```bash
# Start Stripe CLI listener
stripe listen --forward-to localhost:5000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

#### 3. Test Batch Scanning

```bash
# Submit batch scan
curl -X POST http://localhost:5000/api/scan/batch \
  -H "Authorization: Bearer YOUR_PRO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com",
      "https://example.org"
    ],
    "isPrivate": true
  }'

# Check batch status (use batchId from response)
curl http://localhost:5000/api/scan/batch/BATCH_ID/status \
  -H "Authorization: Bearer YOUR_PRO_TOKEN"
```

#### 4. Test API Key Authentication

```bash
# Generate API key
curl -X POST http://localhost:5000/api/api-keys/generate \
  -H "Authorization: Bearer YOUR_PRO_TOKEN"

# Use API key for scan
curl -X POST http://localhost:5000/api/scan/url \
  -H "X-API-Key: pa_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Test Rate Limiting

```bash
# Check API usage
curl http://localhost:5000/api/api-keys/usage \
  -H "Authorization: Bearer YOUR_PRO_TOKEN"

# Headers in response:
# X-RateLimit-Limit: 500
# X-RateLimit-Remaining: 499
# X-RateLimit-Reset: 2025-11-01T00:00:00.000Z
```

## Integration Checklist

### Backend Setup

- [ ] Install Stripe dependency: `pnpm add stripe`
- [ ] Install cuid2 dependency: `pnpm add @paralleldrive/cuid2`
- [ ] Add environment variables to `.env`
- [ ] Verify Prisma schema has User model with Stripe fields
- [ ] Deploy database migrations
- [ ] Test server starts without errors

### Stripe Dashboard Setup

- [ ] Create Pro subscription product ($4.99/month)
- [ ] Copy Price ID to `STRIPE_PRICE_ID`
- [ ] Create webhook endpoint
- [ ] Configure webhook events (checkout.session.completed, etc.)
- [ ] Copy webhook secret to `STRIPE_WEBHOOK_SECRET`
- [ ] Test webhook delivery

### API Testing

- [ ] Test checkout session creation
- [ ] Complete test payment with test card
- [ ] Verify user upgraded to Pro in database
- [ ] Test customer portal access
- [ ] Test batch scanning (Pro only)
- [ ] Test API key generation
- [ ] Test API key authentication
- [ ] Test scan history with tier-based filtering

### Error Handling

- [ ] Verify 403 errors for non-Pro users accessing Pro features
- [ ] Test webhook signature validation
- [ ] Test API key rate limiting (500/month)
- [ ] Test invalid API key handling
- [ ] Test expired subscription handling

### Production Deployment

- [ ] Switch to Stripe production keys
- [ ] Update `STRIPE_PRICE_ID` with production price
- [ ] Configure production webhook endpoint
- [ ] Test production webhook delivery
- [ ] Monitor Stripe Dashboard for events
- [ ] Set up Stripe email notifications
- [ ] Configure tax settings if required

## Error Responses

All endpoints return RFC7807 compliant error responses:

```json
{
  "type": "about:blank",
  "title": "Forbidden",
  "status": 403,
  "detail": "This feature requires a Pro subscription. Please upgrade your account."
}
```

Common error codes:
- `401`: Authentication required or invalid token/API key
- `403`: Pro subscription required or subscription not active
- `404`: Resource not found (user, batch, etc.)
- `429`: Rate limit exceeded
- `500`: Internal server error

## Support & Troubleshooting

### Common Issues

**Webhook signature verification fails:**
- Ensure `STRIPE_WEBHOOK_SECRET` is correct
- Check that raw body parser is configured for webhook endpoint
- Verify webhook endpoint URL is correct in Stripe Dashboard

**User not upgraded after payment:**
- Check webhook events in Stripe Dashboard
- Verify `checkout.session.completed` event was delivered
- Check backend logs for webhook processing errors
- Ensure user metadata is included in checkout session

**API key authentication fails:**
- Verify API key format: `pa_[32 hex chars]`
- Check user has active Pro subscription
- Verify monthly rate limit not exceeded
- Check `X-API-Key` header is included

**Batch scanning permission denied:**
- Ensure user has Pro or Team subscription
- Verify subscription status is ACTIVE or TRIALING
- Check JWT token is valid and not expired

For additional support, check:
- Stripe Dashboard → Developers → Events (for webhook delivery)
- Stripe Dashboard → Developers → Logs (for API errors)
- Backend logs for detailed error messages
