# Rate Limiting Implementation

## Overview

Privacy Advisor implements IP-based rate limiting to enforce scan quotas for free tier users while providing unlimited scans for Pro subscribers. This document describes the complete implementation, architecture, and usage.

## Features

- **Anonymous Users**: 3 scans per day tracked by IP address
- **Free Account Users**: 3 scans per day tracked by user ID
- **Pro Users**: Unlimited scans with no rate limiting
- **Daily Reset**: Limits reset automatically at midnight UTC
- **Priority Queue**: Pro users get higher priority in scan queue
- **Privacy Controls**: Pro users can create private scans

## Architecture

### Components

1. **RateLimitService** (`src/services/rateLimitService.ts`)
   - Core rate limiting logic
   - Database interaction with RateLimit model
   - Daily reset calculation
   - Atomic increment operations

2. **scanRateLimiter Middleware** (`src/middleware/scanRateLimit.ts`)
   - Express middleware for rate limit enforcement
   - Checks limits before scan creation
   - Returns 429 when limit exceeded
   - Attaches rate limit info to requests

3. **Updated Scan Routes** (`src/routes/v2.scan.ts`)
   - Integrates with authentication (optionalAuth)
   - Links scans to users when authenticated
   - Increments rate limits after scan creation
   - Returns rate limit status in responses

### Database Schema

```prisma
model RateLimit {
  id          String   @id @default(cuid())
  identifier  String   // IP address or user ID
  scansCount  Int      @default(0)
  date        String   // YYYY-MM-DD format
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([identifier, date])
  @@index([identifier, date])
}
```

## Implementation Flow

### Anonymous User Scan Request

```
1. POST /v2/scan/url (no auth header)
   ↓
2. optionalAuth middleware
   - No token found
   - req.user = undefined
   ↓
3. scanRateLimiter middleware
   - Check if Pro: No (no user)
   - Get identifier: req.ip (e.g., "192.168.1.100")
   - Check rate limit: SELECT from RateLimit WHERE identifier='192.168.1.100' AND date='2024-01-01'
   - If scansCount >= 3: Return 429
   - If scansCount < 3: Attach rate limit to req, continue
   ↓
4. Route handler
   - Create scan with userId=null, scannerIp='192.168.1.100', isPublic=true
   - Queue scan job with normal priority
   - Increment rate limit: UPDATE RateLimit SET scansCount = scansCount + 1
   - Return 202 with rate limit info
```

### Authenticated Free User Scan Request

```
1. POST /v2/scan/url
   Authorization: Bearer <jwt-token>
   ↓
2. optionalAuth middleware
   - Verify JWT token
   - Load user from database
   - req.user = { id: 'user123', subscription: 'FREE', ... }
   ↓
3. scanRateLimiter middleware
   - Check if Pro: No (subscription='FREE')
   - Get identifier: req.user.id ('user123')
   - Check rate limit: SELECT from RateLimit WHERE identifier='user123' AND date='2024-01-01'
   - If scansCount >= 3: Return 429
   - If scansCount < 3: Attach rate limit to req, continue
   ↓
4. Route handler
   - Create scan with userId='user123', isPublic=true
   - Queue scan job with normal priority
   - Increment rate limit: UPDATE RateLimit SET scansCount = scansCount + 1
   - Return 202 with rate limit info
```

### Pro User Scan Request

```
1. POST /v2/scan/url
   Authorization: Bearer <pro-jwt-token>
   Body: { "url": "...", "isPrivate": true }
   ↓
2. optionalAuth middleware
   - Verify JWT token
   - Load user from database
   - req.user = { id: 'pro123', subscription: 'PRO', subscriptionStatus: 'ACTIVE', ... }
   ↓
3. scanRateLimiter middleware
   - Check if Pro: Yes (subscription='PRO' AND subscriptionStatus='ACTIVE')
   - BYPASS rate limiting
   - Continue without checking limits
   ↓
4. Route handler
   - Create scan with userId='pro123', isPublic=false (private), isProScan=true
   - Queue scan job with URGENT priority
   - NO rate limit increment
   - Return 202 WITHOUT rate limit info (null)
```

## API Response Examples

### Successful Scan (Free User - 1st Scan)

```json
{
  "scanId": "clx123abc456",
  "slug": "privacy-check-abc123",
  "rateLimit": {
    "scansUsed": 1,
    "scansRemaining": 2,
    "resetAt": "2024-01-02T00:00:00.000Z"
  }
}
```

### Successful Scan (Free User - 3rd Scan)

```json
{
  "scanId": "clx789def012",
  "slug": "privacy-check-def789",
  "rateLimit": {
    "scansUsed": 3,
    "scansRemaining": 0,
    "resetAt": "2024-01-02T00:00:00.000Z"
  }
}
```

### Rate Limited (429 Response)

```json
{
  "type": "https://geckoadvisor.com/errors/rate-limit-exceeded",
  "title": "Daily Limit Reached",
  "status": 429,
  "detail": "You have reached the daily limit of 3 free scans. Upgrade to Pro for unlimited scans.",
  "scansUsed": 3,
  "scansRemaining": 0,
  "resetAt": "2024-01-02T00:00:00.000Z",
  "upgradeUrl": "/pricing"
}
```

### Successful Scan (Pro User)

```json
{
  "scanId": "clx345ghi678",
  "slug": "privacy-check-ghi345",
  "rateLimit": null
}
```

## Rate Limit Service API

### RateLimitService Class

```typescript
class RateLimitService {
  /**
   * Check if identifier has exceeded daily limit
   * Returns current usage stats and reset time
   */
  async checkRateLimit(identifier: string): Promise<RateLimitCheckResult>

  /**
   * Increment scan count for identifier
   * Should be called AFTER successful scan creation
   */
  async incrementScan(identifier: string): Promise<void>

  /**
   * Get current rate limit status (read-only)
   */
  async getRateLimitStatus(identifier: string): Promise<RateLimitCheckResult>

  /**
   * Reset rate limit for identifier (admin only)
   */
  async resetRateLimit(identifier: string, date?: string): Promise<void>
}
```

### RateLimitCheckResult Interface

```typescript
interface RateLimitCheckResult {
  allowed: boolean;        // Can user make another scan?
  scansUsed: number;       // Scans used today (0-3)
  scansRemaining: number;  // Scans remaining today (0-3)
  resetAt: Date;           // Tomorrow at midnight UTC
}
```

## Middleware Usage

### scanRateLimiter Middleware

```typescript
import { optionalAuth } from '../middleware/auth.js';
import { scanRateLimiter } from '../middleware/scanRateLimit.js';

router.post('/api/scan/url',
  optionalAuth,        // Try to authenticate (optional)
  scanRateLimiter,     // Check rate limits
  async (req, res) => {
    // Handle scan creation
  }
);
```

**Important**: Use `scanRateLimiter` AFTER `optionalAuth` to ensure `req.user` is available.

## Testing

### Running Tests

```bash
# Run all rate limit tests
cd apps/backend
./test-rate-limit.sh

# Test with authenticated user
export TEST_USER_TOKEN="your-jwt-token"
./test-rate-limit.sh

# Test with Pro user
export TEST_PRO_TOKEN="your-pro-jwt-token"
./test-rate-limit.sh

# Test against different environment
API_URL=https://stage.geckoadvisor.com ./test-rate-limit.sh
```

### Manual Testing

```bash
# Anonymous user - first scan
curl -X POST http://localhost:5000/v2/scan/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
# Expected: 202, scansUsed=1, scansRemaining=2

# Anonymous user - fourth scan (should fail)
curl -X POST http://localhost:5000/v2/scan/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
# Expected: 429, "Daily Limit Reached"

# Authenticated free user
curl -X POST http://localhost:5000/v2/scan/url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"url": "https://example.com"}'
# Expected: 202, scansUsed=1, scansRemaining=2

# Pro user (unlimited)
curl -X POST http://localhost:5000/v2/scan/url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PRO_JWT_TOKEN" \
  -d '{"url": "https://example.com"}'
# Expected: 202, rateLimit=null

# Pro user with private scan
curl -X POST http://localhost:5000/v2/scan/url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PRO_JWT_TOKEN" \
  -d '{"url": "https://example.com", "isPrivate": true}'
# Expected: 202, scan will be private
```

## Database Queries

### Check Rate Limit for IP

```sql
SELECT * FROM "RateLimit"
WHERE identifier = '192.168.1.100'
  AND date = '2024-01-01';
```

### Check Rate Limit for User

```sql
SELECT * FROM "RateLimit"
WHERE identifier = 'user123'
  AND date = '2024-01-01';
```

### Reset Rate Limit (Admin)

```sql
DELETE FROM "RateLimit"
WHERE identifier = 'user123'
  AND date = '2024-01-01';
```

### View All Rate Limits for Today

```sql
SELECT * FROM "RateLimit"
WHERE date = CURRENT_DATE
ORDER BY "scansCount" DESC;
```

## Performance Considerations

### Database Optimization

1. **Unique Index**: `@@unique([identifier, date])` ensures fast lookups and prevents duplicates
2. **Covering Index**: `@@index([identifier, date])` optimizes SELECT queries
3. **Atomic Operations**: Using `upsert` with `increment` prevents race conditions
4. **Daily Partitioning**: Using date string allows automatic cleanup of old records

### Caching Strategy

Rate limit checks are NOT cached because:
- Need real-time accuracy for quota enforcement
- Counts change frequently during active usage
- Database queries are already optimized with indexes
- Risk of stale data causing incorrect 429 responses

### Concurrency Handling

All rate limit operations use atomic database operations:

```typescript
// Atomic increment - safe under concurrent requests
await prisma.rateLimit.upsert({
  where: { identifier_date: { identifier, date } },
  create: { identifier, date, scansCount: 1 },
  update: { scansCount: { increment: 1 } }
});
```

## Security Considerations

### IP Address Tracking

- Uses `req.ip` from Express (respects `trust proxy` setting)
- Works correctly behind proxies/load balancers
- Anonymous users can change IP to reset (acceptable for MVP)

### Identifier Privacy

- IP addresses stored only as identifiers (not logged separately)
- User IDs preferred over IPs for authenticated users
- Old rate limit records can be deleted after reset

### Rate Limit Bypass Prevention

- Pro status checked server-side (not from token claims)
- Subscription status verified against database
- Both subscription tier AND status must be active

## Monitoring & Alerts

### Metrics to Track

1. **Rate Limit Hit Rate**: % of requests returning 429
2. **Average Scans Per User**: Daily average for free users
3. **Upgrade Conversion**: % of rate-limited users who upgrade
4. **Pro User Scan Volume**: Track unlimited scan usage

### Logging

All rate limit events are logged with structured data:

```typescript
// Rate limit check
logger.debug({ identifier, scansUsed, scansRemaining }, 'Rate limit check passed');

// Rate limit exceeded
logger.info({ identifier, scansUsed, resetAt }, 'Rate limit exceeded');

// Increment failure
logger.error({ error, identifier }, 'Failed to increment rate limit');
```

## Troubleshooting

### User Reports Rate Limited Incorrectly

1. Check current rate limit status:
   ```sql
   SELECT * FROM "RateLimit" WHERE identifier = 'USER_ID_OR_IP';
   ```

2. Verify user subscription:
   ```sql
   SELECT subscription, subscriptionStatus FROM "User" WHERE id = 'USER_ID';
   ```

3. Reset rate limit if needed (admin):
   ```typescript
   await rateLimitService.resetRateLimit('user-id-or-ip');
   ```

### Rate Limit Not Working

1. Verify middleware order (optionalAuth BEFORE scanRateLimiter)
2. Check database connection and migrations
3. Verify RateLimit table exists with correct indexes
4. Check for error logs in rate limit service

### Different Count Expected

1. Check if user switched between anonymous and authenticated
2. Verify identifier used (IP vs user ID)
3. Check if date changed (UTC midnight reset)
4. Look for failed scan creations (increment happens after creation)

## Future Enhancements

### Planned Improvements

1. **Configurable Limits**: Make 3 scans/day configurable per environment
2. **Burst Allowance**: Allow temporary bursts above daily limit
3. **Weekly/Monthly Quotas**: Additional quota periods for Pro tiers
4. **Rate Limit Analytics**: Dashboard showing usage patterns
5. **Grace Period**: Allow 1 extra scan with upgrade prompt
6. **IP Fingerprinting**: More robust anonymous user tracking
7. **Redis Cache**: Cache recent rate limit checks for performance

### API Extensions

```typescript
// Future rate limit tiers
interface RateLimitTier {
  name: string;           // 'FREE', 'PRO', 'TEAM'
  dailyLimit: number;     // 3, -1 (unlimited), 100
  burstLimit?: number;    // Allow temporary bursts
  priority: number;       // Queue priority level
}

// Future rate limit status endpoint
GET /v2/user/rate-limit
Response: {
  tier: 'FREE',
  scansUsed: 2,
  scansRemaining: 1,
  dailyLimit: 3,
  resetAt: '2024-01-02T00:00:00Z',
  history: [
    { date: '2024-01-01', scansUsed: 3 },
    { date: '2023-12-31', scansUsed: 2 }
  ]
}
```

## Related Documentation

- [Authentication Implementation](./AUTH_IMPLEMENTATION.md)
- [Freemium Model](../../docs/FREEMIUM_MODEL.md)
- [API Reference](./API_REFERENCE.md)
- [Database Schema](../../infra/prisma/schema.prisma)

## Support

For questions or issues:
- Check logs: `docker logs privacy-advisor-backend-1`
- Review test results: `./test-rate-limit.sh`
- Database console: `npx prisma studio --schema=infra/prisma/schema.prisma`
- Contact: Privacy Advisor Team
