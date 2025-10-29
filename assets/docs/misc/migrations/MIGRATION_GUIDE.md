# Freemium Model Migration Guide

## Overview
This migration adds support for user accounts, subscriptions, rate limiting, and Pro features to Gecko Advisor.

## Migration: 20251006213752_add_freemium_models

### What's Changed

#### New Enums
- `Subscription`: FREE, PRO, TEAM
- `SubscriptionStatus`: INACTIVE, ACTIVE, PAST_DUE, CANCELED, TRIALING
- `CheckFrequency`: DAILY, WEEKLY, MONTHLY

#### New Tables
1. **User** - User accounts with authentication and subscription management
   - Primary fields: id, email, name, passwordHash, emailVerified
   - Subscription fields: subscription, stripeCustomerId, stripeSubscriptionId, subscriptionStatus, subscriptionEndsAt
   - API fields: apiKey, apiCallsMonth, apiResetAt
   - Relations: scans[], watchedUrls[]

2. **RateLimit** - Daily rate limiting for anonymous and free users
   - Fields: id, identifier (IP or userId), scansCount, date (YYYY-MM-DD)
   - Unique constraint on [identifier, date]
   - Optimized for fast lookups by identifier and date

3. **WatchedUrl** - Pro feature for monitoring URLs
   - Fields: id, userId, url, lastScore, lastChecked, checkFrequency, alertOnChange
   - Unique constraint on [userId, url]
   - Cascade delete when user is deleted

#### Enhanced Tables
**Scan** - Added freemium support:
- `userId` (String?, optional) - Links scan to user account
- `isPublic` (Boolean, default true) - Pro users can make scans private
- `isProScan` (Boolean, default false) - Tracks if Pro features were used
- `scannerIp` (String?, optional) - For anonymous rate limiting

### Performance Optimizations

#### New Indexes
1. **User table**:
   - `User_email_idx` - Fast user lookup by email
   - `User_apiKey_idx` - Fast API authentication
   - `User_stripeCustomerId_idx` - Stripe integration queries

2. **Scan table**:
   - `Scan_user_history_idx` - User's scan history (userId, createdAt DESC)
   - `Scan_public_reports_idx` - Public reports page (isPublic, createdAt DESC)
   - `Scan_ip_ratelimit_idx` - IP-based rate limiting (scannerIp, createdAt DESC)

3. **RateLimit table**:
   - `RateLimit_lookup_idx` - Fast daily rate limit checks

4. **WatchedUrl table**:
   - `WatchedUrl_schedule_idx` - Efficient scheduled monitoring queries

### Migration Safety Assessment

#### Breaking Changes: NONE
- All new fields on Scan table are optional or have defaults
- Existing scans will work without user accounts (userId = null)
- No changes to existing Evidence, Issue, or CachedList models

#### Data Integrity
- Foreign key constraints ensure referential integrity
- Cascade deletes prevent orphaned records
- Unique constraints prevent duplicate data

#### Zero-Downtime Compatible: YES
- Schema changes are additive only
- No data transformation required
- Existing queries continue to work

### Estimated Migration Time
- Small database (<10k scans): <5 seconds
- Medium database (10k-100k scans): 5-15 seconds
- Large database (>100k scans): 15-30 seconds

Index creation is the primary time consumer. The migration adds 10 new indexes.

## How to Apply This Migration

### Option 1: Using Prisma Migrate (Recommended)
```bash
# From project root
cd /Users/pothamsettyk/Projects/Privacy-Advisor

# Deploy migration
pnpm prisma:migrate
# OR
npx prisma migrate deploy --schema=infra/prisma/schema.prisma
```

### Option 2: Using Docker/Make
```bash
# Deploy to development environment
make migrate ENV=dev

# Deploy to stage environment
make migrate ENV=stage

# Deploy to production environment
make migrate ENV=prod
```

### Option 3: Manual SQL Execution
If you need to apply manually:
```bash
# Connect to your database
psql $DATABASE_URL

# Run the migration SQL
\i /Users/pothamsettyk/Projects/Privacy-Advisor/infra/prisma/migrations/20251006213752_add_freemium_models/migration.sql
```

## Validation Steps

### 1. Verify Schema Changes
```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('User', 'RateLimit', 'WatchedUrl');

-- Check Scan table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Scan'
AND column_name IN ('userId', 'isPublic', 'isProScan', 'scannerIp');

-- Check enums created
SELECT typname FROM pg_type
WHERE typname IN ('Subscription', 'SubscriptionStatus', 'CheckFrequency');
```

### 2. Verify Indexes Created
```sql
-- Check new indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'User_email_idx',
    'User_apiKey_idx',
    'User_stripeCustomerId_idx',
    'Scan_user_history_idx',
    'Scan_public_reports_idx',
    'Scan_ip_ratelimit_idx',
    'RateLimit_lookup_idx',
    'WatchedUrl_schedule_idx'
);
```

### 3. Verify Foreign Keys
```sql
-- Check foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('Scan', 'WatchedUrl');
```

### 4. Test Basic Operations
```sql
-- Test User creation
INSERT INTO "User" (id, email, name, subscription, subscriptionStatus)
VALUES ('test_user_1', 'test@example.com', 'Test User', 'FREE', 'INACTIVE')
RETURNING *;

-- Test Scan with userId
INSERT INTO "Scan" (id, targetType, input, status, slug, userId, isPublic, isProScan)
VALUES ('test_scan_1', 'url', 'https://example.com', 'pending', 'test-scan-1', 'test_user_1', true, false)
RETURNING *;

-- Test RateLimit
INSERT INTO "RateLimit" (id, identifier, scansCount, date)
VALUES ('test_rate_1', '192.168.1.1', 1, '2025-10-06')
RETURNING *;

-- Test WatchedUrl
INSERT INTO "WatchedUrl" (id, userId, url, checkFrequency)
VALUES ('test_watch_1', 'test_user_1', 'https://example.com', 'WEEKLY')
RETURNING *;

-- Clean up test data
DELETE FROM "WatchedUrl" WHERE id = 'test_watch_1';
DELETE FROM "Scan" WHERE id = 'test_scan_1';
DELETE FROM "RateLimit" WHERE id = 'test_rate_1';
DELETE FROM "User" WHERE id = 'test_user_1';
```

## Rollback Procedure

### Automatic Rollback (Prisma Migrate)
```bash
# Prisma doesn't support automatic rollback
# Use manual rollback SQL below
```

### Manual Rollback
See `ROLLBACK_20251006213752_add_freemium_models.sql` for complete rollback script.

Quick rollback:
```sql
-- Drop foreign keys first
ALTER TABLE "WatchedUrl" DROP CONSTRAINT "WatchedUrl_userId_fkey";
ALTER TABLE "Scan" DROP CONSTRAINT "Scan_userId_fkey";

-- Drop new indexes on Scan
DROP INDEX IF EXISTS "Scan_user_history_idx";
DROP INDEX IF EXISTS "Scan_public_reports_idx";
DROP INDEX IF EXISTS "Scan_ip_ratelimit_idx";

-- Remove new columns from Scan
ALTER TABLE "Scan" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "Scan" DROP COLUMN IF EXISTS "isPublic";
ALTER TABLE "Scan" DROP COLUMN IF EXISTS "isProScan";
ALTER TABLE "Scan" DROP COLUMN IF EXISTS "scannerIp";

-- Drop new tables
DROP TABLE IF EXISTS "WatchedUrl";
DROP TABLE IF EXISTS "RateLimit";
DROP TABLE IF EXISTS "User";

-- Drop new enums
DROP TYPE IF EXISTS "CheckFrequency";
DROP TYPE IF EXISTS "SubscriptionStatus";
DROP TYPE IF EXISTS "Subscription";
```

## Post-Migration Tasks

### 1. Update Prisma Client
```bash
# Generate new Prisma client with updated types
pnpm prisma:generate
# OR
npx prisma generate --schema=infra/prisma/schema.prisma
```

### 2. Update Application Code
The following API endpoints will need implementation:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/user/me` - Get current user
- `GET /api/user/scans` - Get user's scan history
- `POST /api/user/watched-urls` - Add URL to watch list
- `GET /api/user/watched-urls` - Get watched URLs
- `POST /api/stripe/webhook` - Stripe webhook handler
- Rate limiting middleware for scan endpoints

### 3. Environment Variables
Add these to your `.env`:
```bash
# Stripe Integration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...

# JWT Authentication
JWT_SECRET=your-secure-secret-here
JWT_EXPIRES_IN=7d

# Rate Limiting
FREE_TIER_DAILY_LIMIT=3
PRO_TIER_RATE_LIMIT=1000
```

### 4. Seed Demo Data (Optional)
```sql
-- Create demo free user
INSERT INTO "User" (id, email, name, subscription, subscriptionStatus, emailVerified)
VALUES ('demo_free', 'free@example.com', 'Free User', 'FREE', 'ACTIVE', true);

-- Create demo pro user
INSERT INTO "User" (id, email, name, subscription, subscriptionStatus, emailVerified, apiKey)
VALUES ('demo_pro', 'pro@example.com', 'Pro User', 'PRO', 'ACTIVE', true, 'demo_api_key_123');
```

## Monitoring Recommendations

### Performance Metrics to Track
1. **Index Usage**:
```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname IN (
    'User_email_idx', 'User_apiKey_idx',
    'Scan_user_history_idx', 'Scan_public_reports_idx',
    'RateLimit_lookup_idx'
)
ORDER BY idx_scan DESC;
```

2. **Table Growth**:
```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE tablename IN ('User', 'RateLimit', 'WatchedUrl', 'Scan')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

3. **Rate Limit Efficiency**:
```sql
-- Check rate limit table size and cleanup needs
SELECT
    COUNT(*) as total_records,
    COUNT(DISTINCT identifier) as unique_identifiers,
    MIN(date) as oldest_date,
    MAX(date) as newest_date
FROM "RateLimit";
```

### Cleanup Jobs to Schedule
1. **Rate Limit Cleanup** (Run daily):
```sql
-- Delete rate limit records older than 30 days
DELETE FROM "RateLimit"
WHERE createdAt < NOW() - INTERVAL '30 days';
```

2. **User Cleanup** (Run weekly):
```sql
-- Find inactive free users without scans
SELECT id, email, createdAt
FROM "User"
WHERE subscription = 'FREE'
AND subscriptionStatus = 'INACTIVE'
AND NOT EXISTS (SELECT 1 FROM "Scan" WHERE "Scan"."userId" = "User".id)
AND createdAt < NOW() - INTERVAL '90 days';
```

## Support and Issues

If you encounter any issues during migration:

1. Check the validation queries above to verify schema state
2. Review application logs for Prisma query errors
3. Verify DATABASE_URL is correctly set
4. Ensure PostgreSQL version is 12+
5. Check that all dependencies are installed: `pnpm install`

## Next Steps

After successful migration:
1. Implement authentication endpoints
2. Add rate limiting middleware
3. Integrate Stripe for payments
4. Update frontend to support user accounts
5. Add Pro feature toggles
6. Implement watched URL monitoring job
7. Add API key validation middleware

---
**Migration Created**: 2025-10-06
**Schema Version**: Freemium Model v1
**Safety Level**: HIGH (Zero breaking changes)
**Rollback Available**: YES
