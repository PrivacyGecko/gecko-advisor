# Pro Tier Features - Testing Examples

Complete testing guide with cURL examples and expected responses.

## Prerequisites

```bash
# Set your test environment variables
export API_URL="http://localhost:5000"
export AUTH_TOKEN="YOUR_JWT_TOKEN"
export PRO_TOKEN="YOUR_PRO_USER_JWT_TOKEN"
export API_KEY="pa_YOUR_API_KEY"
```

## 1. Stripe Checkout Flow

### Create Checkout Session

```bash
curl -X POST "$API_URL/api/stripe/create-checkout" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -v

# Expected Response (202):
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_a1b2c3d4e5f6g7h8i9j0"
}

# Error Response - Already Subscribed (400):
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "You already have an active Pro subscription. Use the customer portal to manage it."
}
```

### Get Subscription Status

```bash
curl "$API_URL/api/stripe/subscription" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -v

# Expected Response - Pro User (200):
{
  "subscription": "PRO",
  "subscriptionStatus": "ACTIVE",
  "subscriptionEndsAt": "2025-11-06T00:00:00.000Z",
  "hasActiveSubscription": true
}

# Expected Response - Free User (200):
{
  "subscription": "FREE",
  "subscriptionStatus": "INACTIVE",
  "subscriptionEndsAt": null,
  "hasActiveSubscription": false
}
```

### Create Customer Portal Session

```bash
curl -X POST "$API_URL/api/stripe/create-portal" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  -H "Content-Type: application/json" \
  -v

# Expected Response (200):
{
  "url": "https://billing.stripe.com/p/session/..."
}

# Error Response - No Stripe Customer (400):
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "No Stripe customer found. Please subscribe first."
}
```

## 2. Batch Scanning

### Submit Batch Scan

```bash
curl -X POST "$API_URL/api/scan/batch" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com",
      "https://example.org",
      "https://example.net"
    ],
    "isPrivate": true
  }' \
  -v

# Expected Response (202):
{
  "batchId": "clx1234567890abcdefghijk",
  "totalScans": 3,
  "scans": [
    {
      "scanId": "clx1111111111111111111111",
      "slug": "example-com-abc123",
      "url": "https://example.com"
    },
    {
      "scanId": "clx2222222222222222222222",
      "slug": "example-org-def456",
      "url": "https://example.org"
    },
    {
      "scanId": "clx3333333333333333333333",
      "slug": "example-net-ghi789",
      "url": "https://example.net"
    }
  ]
}
```

### Batch Scan Validation Errors

```bash
# Too many URLs
curl -X POST "$API_URL/api/scan/batch" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://url1.com", "https://url2.com", "https://url3.com",
      "https://url4.com", "https://url5.com", "https://url6.com",
      "https://url7.com", "https://url8.com", "https://url9.com",
      "https://url10.com", "https://url11.com"
    ]
  }'

# Expected Response (400):
{
  "type": "about:blank",
  "title": "Invalid Request",
  "status": 400,
  "detail": {
    "formErrors": [],
    "fieldErrors": {
      "urls": ["Maximum 10 URLs allowed per batch"]
    }
  }
}

# Invalid URL format
curl -X POST "$API_URL/api/scan/batch" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["not-a-valid-url", "https://valid.com"]
  }'

# Expected Response (400):
{
  "type": "about:blank",
  "title": "Invalid Request",
  "status": 400,
  "detail": {
    "formErrors": [],
    "fieldErrors": {
      "urls": ["Invalid URL format"]
    }
  }
}

# Free user trying to use batch scan
curl -X POST "$API_URL/api/scan/batch" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com"]}'

# Expected Response (403):
{
  "type": "about:blank",
  "title": "Forbidden",
  "status": 403,
  "detail": "This feature requires a Pro subscription. Please upgrade your account."
}
```

### Get Batch Status

```bash
curl "$API_URL/api/scan/batch/clx1234567890abcdefghijk/status" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  -v

# Expected Response - In Progress (200):
{
  "batchId": "clx1234567890abcdefghijk",
  "total": 3,
  "completed": 1,
  "failed": 0,
  "processing": 1,
  "queued": 1,
  "isComplete": false,
  "scans": [
    {
      "scanId": "clx1111111111111111111111",
      "slug": "example-com-abc123",
      "url": "https://example.com",
      "status": "done",
      "score": 85,
      "label": "Good",
      "createdAt": "2025-10-06T10:00:00.000Z",
      "finishedAt": "2025-10-06T10:00:15.000Z"
    },
    {
      "scanId": "clx2222222222222222222222",
      "slug": "example-org-def456",
      "url": "https://example.org",
      "status": "processing",
      "createdAt": "2025-10-06T10:00:00.000Z"
    },
    {
      "scanId": "clx3333333333333333333333",
      "slug": "example-net-ghi789",
      "url": "https://example.net",
      "status": "queued",
      "createdAt": "2025-10-06T10:00:00.000Z"
    }
  ]
}

# Expected Response - Complete (200):
{
  "batchId": "clx1234567890abcdefghijk",
  "total": 3,
  "completed": 3,
  "failed": 0,
  "processing": 0,
  "queued": 0,
  "isComplete": true,
  "scans": [...]
}
```

### Get Batch History

```bash
curl "$API_URL/api/scan/batch/history" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  -v

# Expected Response (200):
{
  "batches": [
    {
      "batchId": "clx1234567890abcdefghijk",
      "total": 3,
      "completed": 3,
      "failed": 0,
      "processing": 0,
      "queued": 0,
      "isComplete": true,
      "createdAt": "2025-10-06T10:00:00.000Z"
    },
    {
      "batchId": "clx9876543210zyxwvutsrqpo",
      "total": 5,
      "completed": 4,
      "failed": 1,
      "processing": 0,
      "queued": 0,
      "isComplete": true,
      "createdAt": "2025-10-05T14:30:00.000Z"
    }
  ]
}
```

## 3. API Key Management

### Generate API Key

```bash
curl -X POST "$API_URL/api/api-keys/generate" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  -H "Content-Type: application/json" \
  -v

# Expected Response - First Time (200):
{
  "apiKey": "pa_0123456789abcdef0123456789abcdef",
  "usage": {
    "callsThisMonth": 0,
    "limit": 500,
    "resetAt": "2025-11-01T00:00:00.000Z"
  }
}

# Expected Response - Regenerating (200):
{
  "apiKey": "pa_fedcba9876543210fedcba9876543210",
  "usage": {
    "callsThisMonth": 0,
    "limit": 500,
    "resetAt": "2025-11-01T00:00:00.000Z"
  },
  "warning": "Your previous API key has been revoked. Update your applications with the new key."
}

# Error Response - Free User (403):
{
  "type": "about:blank",
  "title": "Forbidden",
  "status": 403,
  "detail": "This feature requires a Pro subscription. Please upgrade your account."
}
```

### Get API Key Usage

```bash
curl "$API_URL/api/api-keys/usage" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  -v

# Expected Response (200):
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

# Expected Response - No API Key (200):
{
  "apiKey": null,
  "hasApiKey": false,
  "usage": {
    "callsThisMonth": 0,
    "limit": 500,
    "remaining": 500,
    "resetAt": "2025-11-01T00:00:00.000Z"
  }
}
```

### Revoke API Key

```bash
curl -X DELETE "$API_URL/api/api-keys/revoke" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  -v

# Expected Response (200):
{
  "success": true,
  "message": "API key revoked successfully"
}

# Error Response - No API Key (400):
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "No API key to revoke"
}
```

## 4. API Key Authentication

### Using API Key for Scan

```bash
curl -X POST "$API_URL/api/scan/url" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}' \
  -v

# Expected Response (202):
{
  "scanId": "clx1111111111111111111111",
  "slug": "example-com-abc123"
}

# Response Headers:
# X-RateLimit-Limit: 500
# X-RateLimit-Remaining: 499
# X-RateLimit-Reset: 2025-11-01T00:00:00.000Z
```

### API Key Errors

```bash
# Invalid API key format
curl -X POST "$API_URL/api/scan/url" \
  -H "X-API-Key: invalid_key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Expected Response (401):
{
  "type": "about:blank",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Invalid API key format"
}

# API key not found
curl -X POST "$API_URL/api/scan/url" \
  -H "X-API-Key: pa_00000000000000000000000000000000" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Expected Response (401):
{
  "type": "about:blank",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Invalid API key"
}

# Rate limit exceeded
curl -X POST "$API_URL/api/scan/url" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Expected Response (429):
{
  "type": "about:blank",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "API rate limit exceeded. Limit: 500 calls per month. Resets at: 2025-11-01T00:00:00.000Z"
}

# Expired/inactive subscription
curl -X POST "$API_URL/api/scan/url" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Expected Response (403):
{
  "type": "about:blank",
  "title": "Forbidden",
  "status": 403,
  "detail": "Your Pro subscription is not active"
}
```

## 5. Scan History

### Get Scan History

```bash
# Pro user - 90 days history
curl "$API_URL/api/scans/history" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  -v

# Expected Response (200):
{
  "scans": [
    {
      "scanId": "clx1111111111111111111111",
      "slug": "example-com-abc123",
      "targetType": "url",
      "url": "https://example.com",
      "normalizedInput": "https://example.com/",
      "status": "done",
      "score": 85,
      "label": "Good",
      "isPublic": false,
      "isProScan": true,
      "source": "batch",
      "batchId": "clx1234567890abcdefghijk",
      "createdAt": "2025-10-06T10:00:00.000Z",
      "finishedAt": "2025-10-06T10:00:15.000Z"
    },
    {
      "scanId": "clx2222222222222222222222",
      "slug": "example-org-def456",
      "targetType": "url",
      "url": "https://example.org",
      "status": "done",
      "score": 72,
      "label": "Caution",
      "isPublic": true,
      "isProScan": true,
      "source": "manual",
      "createdAt": "2025-10-05T14:30:00.000Z",
      "finishedAt": "2025-10-05T14:30:12.000Z"
    }
  ],
  "total": 2,
  "daysBack": 90,
  "isPro": true,
  "cutoffDate": "2025-07-08T00:00:00.000Z"
}

# Free user - 7 days history
curl "$API_URL/api/scans/history" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -v

# Expected Response (200):
{
  "scans": [...],
  "total": 1,
  "daysBack": 7,
  "isPro": false,
  "cutoffDate": "2025-09-29T00:00:00.000Z"
}
```

## 6. Stripe Webhook Testing

### Test Webhook Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5000/api/stripe/webhook

# Trigger test events in another terminal
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
stripe trigger invoice.payment_succeeded
```

### Manual Webhook Test

```bash
# Get webhook signing secret from Stripe CLI output
export WEBHOOK_SECRET="whsec_test_..."

# Construct test event (simplified)
curl -X POST "$API_URL/api/stripe/webhook" \
  -H "Stripe-Signature: t=timestamp,v1=signature" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_webhook",
    "object": "event",
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_123",
        "object": "checkout.session",
        "metadata": {
          "userId": "clx_user_id"
        }
      }
    }
  }'

# Expected Response (200):
{
  "received": true
}
```

## 7. Integration Test Script

Save as `test-pro-features.sh`:

```bash
#!/bin/bash

# Configuration
API_URL="http://localhost:5000"
PRO_TOKEN="YOUR_PRO_JWT_TOKEN"

echo "=== Testing Pro Tier Features ==="

# 1. Get subscription status
echo -e "\n1. Get Subscription Status"
curl -s "$API_URL/api/stripe/subscription" \
  -H "Authorization: Bearer $PRO_TOKEN" | jq .

# 2. Generate API key
echo -e "\n2. Generate API Key"
API_RESPONSE=$(curl -s -X POST "$API_URL/api/api-keys/generate" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  -H "Content-Type: application/json")
echo "$API_RESPONSE" | jq .
API_KEY=$(echo "$API_RESPONSE" | jq -r .apiKey)

# 3. Get API usage
echo -e "\n3. Get API Usage"
curl -s "$API_URL/api/api-keys/usage" \
  -H "Authorization: Bearer $PRO_TOKEN" | jq .

# 4. Submit batch scan
echo -e "\n4. Submit Batch Scan"
BATCH_RESPONSE=$(curl -s -X POST "$API_URL/api/scan/batch" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://example.com", "https://example.org"],
    "isPrivate": true
  }')
echo "$BATCH_RESPONSE" | jq .
BATCH_ID=$(echo "$BATCH_RESPONSE" | jq -r .batchId)

# 5. Get batch status
echo -e "\n5. Get Batch Status"
curl -s "$API_URL/api/scan/batch/$BATCH_ID/status" \
  -H "Authorization: Bearer $PRO_TOKEN" | jq .

# 6. Use API key for scan
echo -e "\n6. Use API Key for Scan"
curl -s -X POST "$API_URL/api/scan/url" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.net"}' | jq .

# 7. Get scan history
echo -e "\n7. Get Scan History"
curl -s "$API_URL/api/scans/history" \
  -H "Authorization: Bearer $PRO_TOKEN" | jq .

echo -e "\n=== Tests Complete ==="
```

Run with:
```bash
chmod +x test-pro-features.sh
./test-pro-features.sh
```

## Summary

All Pro tier features are now accessible via:

1. **Stripe Integration**: `/api/stripe/*`
2. **Batch Scanning**: `/api/scan/batch`
3. **API Key Management**: `/api/api-keys/*`
4. **Scan History**: `/api/scans/history`

All endpoints return RFC7807 compliant errors and support proper authentication via JWT tokens or API keys.
