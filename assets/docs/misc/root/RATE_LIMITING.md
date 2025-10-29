# Rate Limiting Implementation

## Overview

Gecko Advisor implements IP-based and user-based rate limiting to enforce the freemium model:

- **FREE TIER**: 3 scans per day (tracked by IP for anonymous users, user ID for accounts)
- **PRO TIER**: Unlimited scans (bypasses rate limiting)

Rate limits reset daily at midnight UTC.

## Architecture

### Components

1. **RateLimitService** (`apps/backend/src/services/rateLimitService.ts`)
   - Core rate limiting logic
   - Daily limit tracking in PostgreSQL
   - Methods: `checkRateLimit()`, `incrementScan()`, `getRateLimitStatus()`

2. **scanRateLimiter Middleware** (`apps/backend/src/middleware/scanRateLimit.ts`)
   - Express middleware for scan endpoints
   - Bypasses Pro users automatically
   - Returns 429 error when limit exceeded

3. **Database Model** (RateLimit in Prisma schema)
   ```prisma
   model RateLimit {
     id              String    @id @default(cuid())
     identifier      String    // IP address or user ID
     scansCount      Int       @default(0)
     date            String    // YYYY-MM-DD format
     createdAt       DateTime  @default(now())
     updatedAt       DateTime  @updatedAt
     
     @@unique([identifier, date])
     @@index([identifier, date])
   }
   ```

## Implementation Details

### Rate Limit Flow

1. **Request arrives** at `POST /api/v2/scan`
2. **optionalAuth middleware** attempts authentication
3. **scanRateLimiter middleware** checks:
   - If Pro user → bypass, continue
   - If free user → check rate limit
   - If limit exceeded → return 429 error
4. **Scan created** and queued
5. **Rate limit incremented** (for free users)
6. **Response includes rate limit info**

### Identifier Logic

```typescript
const identifier = user?.id || req.ip || 'unknown';
```

- **Authenticated users**: Tracked by user ID
- **Anonymous users**: Tracked by IP address
- **Unknown**: Fallback identifier (edge case)

### Pro User Bypass

Pro users are identified by:
```typescript
const isPro = 
  user?.subscription === 'PRO' && 
  user?.subscriptionStatus === 'ACTIVE';
```

Pro users with `TRIALING` status also bypass limits.

### Daily Reset

Rate limits reset at midnight UTC:
```typescript
private getTomorrowMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}
```

## API Response Format

### Success Response (Free User)
```json
{
  "scanId": "cm2x...",
  "slug": "abc123",
  "rateLimit": {
    "scansUsed": 2,
    "scansRemaining": 1,
    "resetAt": "2025-10-07T00:00:00.000Z"
  }
}
```

### Success Response (Pro User)
```json
{
  "scanId": "cm2x...",
  "slug": "abc123",
  "rateLimit": null
}
```

### Rate Limit Exceeded (429 Error)
```json
{
  "type": "rate_limit_exceeded",
  "title": "Daily Limit Reached",
  "status": 429,
  "detail": "You have reached the daily limit of 3 free scans.",
  "scansUsed": 3,
  "scansRemaining": 0,
  "resetAt": "2025-10-07T00:00:00.000Z",
  "upgradeUrl": "/pricing"
}
```

## Testing

### Automated Tests

Run the test script:
```bash
cd apps/backend
./test-rate-limiting.sh
```

The script tests:
1. Anonymous user first scan (1/3)
2. Anonymous user second scan (2/3)
3. Anonymous user third scan (3/3)
4. Anonymous user fourth scan (blocked with 429)
5. Free account creation and rate limiting
6. Pro user bypass (manual verification)

### Manual Testing

#### Test Anonymous Rate Limiting
```bash
# First scan (should succeed)
curl -X POST http://localhost:5000/api/v2/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# Repeat 2 more times (should succeed)
# Fourth scan (should return 429)
```

#### Test Authenticated Rate Limiting
```bash
# Create account
curl -X POST http://localhost:5000/api/auth/create-account \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Use token for scans
curl -X POST http://localhost:5000/api/v2/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"url":"https://example.com"}'
```

#### Test Pro User Bypass
```bash
# 1. Update user to Pro in database
UPDATE "User" 
SET subscription = 'PRO', "subscriptionStatus" = 'ACTIVE' 
WHERE email = 'test@example.com';

# 2. Login to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 3. Make unlimited scans (should all succeed)
curl -X POST http://localhost:5000/api/v2/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"url":"https://example.com"}'
```

## Database Queries

### Check Rate Limit for User
```sql
SELECT * FROM "RateLimit" 
WHERE identifier = 'user-id-or-ip' 
  AND date = '2025-10-06';
```

### View All Rate Limits for Today
```sql
SELECT * FROM "RateLimit" 
WHERE date = '2025-10-06' 
ORDER BY "scansCount" DESC;
```

### Reset Rate Limit (Admin)
```sql
DELETE FROM "RateLimit" 
WHERE identifier = 'user-id-or-ip' 
  AND date = '2025-10-06';
```

## Performance Considerations

- **Upsert Operations**: Rate limits use `upsert` for atomic updates
- **Database Indexes**: Composite unique index on `[identifier, date]` for fast lookups
- **Caching**: Consider Redis caching for high-traffic scenarios
- **Cleanup**: Old rate limit records should be purged periodically

### Recommended Cleanup Job
```sql
DELETE FROM "RateLimit" 
WHERE "createdAt" < NOW() - INTERVAL '30 days';
```

## Frontend Integration

### Display Rate Limit Info

The frontend should display rate limit information from API responses:

```typescript
interface RateLimitInfo {
  scansUsed: number;
  scansRemaining: number;
  resetAt: string;
}

// Show in UI
{rateLimit && (
  <div className="text-sm text-gray-600">
    {rateLimit.scansRemaining} scans remaining today
    • Resets at {formatTime(rateLimit.resetAt)}
  </div>
)}
```

### Handle 429 Errors

```typescript
try {
  const response = await fetch('/api/v2/scan', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  
  if (response.status === 429) {
    const error = await response.json();
    // Show upgrade prompt
    showUpgradeModal({
      message: error.detail,
      resetAt: error.resetAt,
      upgradeUrl: error.upgradeUrl,
    });
    return;
  }
  
  const data = await response.json();
  // Handle success
} catch (error) {
  // Handle network error
}
```

## Security Considerations

1. **IP Spoofing**: Rate limits by IP can be circumvented with VPNs/proxies
   - Mitigation: Encourage account creation for better tracking
   - Consider fingerprinting for enhanced anonymous rate limiting

2. **Account Abuse**: Users could create multiple accounts
   - Mitigation: Email verification (Phase 4)
   - Consider device fingerprinting

3. **Database Load**: High traffic could cause database contention
   - Mitigation: Use Redis for rate limiting in production
   - Implement read replicas for queries

## Future Enhancements

1. **Redis-based Rate Limiting**: Replace PostgreSQL with Redis for better performance
2. **Tiered Limits**: Different limits for different user tiers
3. **API-specific Limits**: Separate limits for API vs UI requests
4. **Rate Limit Analytics**: Track usage patterns and abuse
5. **Dynamic Limits**: Adjust limits based on system load
6. **Grace Period**: Allow slight overages before hard blocking

## Troubleshooting

### Issue: Rate limit not resetting
- **Check**: Verify date string format matches YYYY-MM-DD
- **Check**: Ensure UTC timezone is used consistently
- **Fix**: Manual cleanup: `DELETE FROM "RateLimit" WHERE date < '2025-10-06'`

### Issue: Pro users still rate limited
- **Check**: Verify user subscription and status in database
- **Check**: Ensure `optionalAuth` middleware runs before `scanRateLimiter`
- **Check**: Token is valid and user is loaded correctly

### Issue: Rate limit incremented twice
- **Check**: Ensure `incrementScan()` only called after successful scan creation
- **Check**: No duplicate middleware application
- **Fix**: Wrap increment in try-catch and log errors

## Related Documentation

- [Phase 3 Prompt](./assets/prompts/Phase%203.txt) - Original requirements
- [Authentication System](./apps/backend/src/services/authService.ts) - Auth integration
- [Scan Routes](./apps/backend/src/routes/v2.scan.ts) - Implementation
- [Prisma Schema](./infra/prisma/schema.prisma) - Database models
