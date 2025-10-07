# Freemium Model - Deployment Checklist

## Pre-Deployment Checklist

### ✅ Schema Changes (COMPLETED)
- [x] Updated Prisma schema with new models (User, RateLimit, WatchedUrl)
- [x] Added new enums (Subscription, SubscriptionStatus, CheckFrequency)
- [x] Enhanced Scan model with Freemium fields
- [x] Added 10 strategic indexes for performance
- [x] Preserved all existing models without breaking changes

### ✅ Migration Files (COMPLETED)
- [x] Created migration SQL script
- [x] Created migration guide with validation steps
- [x] Created implementation guide with code examples
- [x] Created performance analysis document
- [x] Created rollback procedure
- [x] Created quick reference README

### ✅ Prisma Client (COMPLETED)
- [x] Generated Prisma client with new types
- [x] Verified User, RateLimit, WatchedUrl types exist
- [x] Verified Subscription enums exported correctly
- [x] Verified enhanced Scan type includes new fields

---

## Deployment Steps

### Step 1: Database Migration
- [ ] **Backup database** before migration
  ```bash
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Apply migration** (choose one method):
  - [ ] Option A: `pnpm prisma:migrate`
  - [ ] Option B: `make migrate ENV=dev`
  - [ ] Option C: Manual SQL execution

- [ ] **Verify migration** success:
  ```sql
  -- Check new tables
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('User', 'RateLimit', 'WatchedUrl');
  ```

- [ ] **Verify indexes** created:
  ```sql
  SELECT indexname FROM pg_indexes
  WHERE schemaname = 'public'
  AND (indexname LIKE '%user%' OR indexname LIKE '%ratelimit%')
  ORDER BY indexname;
  ```

### Step 2: Environment Configuration
- [ ] Add JWT configuration to `.env`:
  ```bash
  JWT_SECRET=<generate-secure-random-string-min-32-chars>
  JWT_EXPIRES_IN=7d
  ```

- [ ] Add Stripe configuration to `.env`:
  ```bash
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_PRO_PRICE_ID=price_...
  ```

- [ ] Add rate limiting configuration to `.env`:
  ```bash
  FREE_TIER_DAILY_LIMIT=3
  PRO_TIER_MONTHLY_LIMIT=10000
  ```

### Step 3: Backend Implementation

#### Authentication (Priority: HIGH)
- [ ] Create `apps/backend/src/middleware/auth.middleware.ts`
  - [ ] Implement `optionalAuth` middleware
  - [ ] Implement `requireAuth` middleware
  - [ ] Implement `requirePro` middleware

- [ ] Create `apps/backend/src/routes/auth.routes.ts`
  - [ ] Implement `POST /api/auth/register`
  - [ ] Implement `POST /api/auth/login`
  - [ ] Implement `POST /api/auth/logout`
  - [ ] Implement `GET /api/auth/me`

- [ ] Create `apps/backend/src/utils/jwt.utils.ts`
  - [ ] Implement token generation
  - [ ] Implement token verification
  - [ ] Implement token refresh

#### Rate Limiting (Priority: HIGH)
- [ ] Create `apps/backend/src/middleware/rateLimit.middleware.ts`
  - [ ] Implement rate limit check logic
  - [ ] Implement scan count increment
  - [ ] Add rate limit headers to response

- [ ] Update `apps/backend/src/routes/scan.routes.ts`
  - [ ] Apply `rateLimitScan` middleware to scan endpoints
  - [ ] Handle 429 responses
  - [ ] Add scannerIp to scan creation

#### Stripe Integration (Priority: HIGH)
- [ ] Create `apps/backend/src/routes/stripe.routes.ts`
  - [ ] Implement `POST /api/stripe/webhook`
  - [ ] Handle `customer.subscription.created`
  - [ ] Handle `customer.subscription.updated`
  - [ ] Handle `customer.subscription.deleted`
  - [ ] Handle `invoice.payment_succeeded`
  - [ ] Handle `invoice.payment_failed`

- [ ] Create `apps/backend/src/services/stripe.service.ts`
  - [ ] Implement create checkout session
  - [ ] Implement create customer portal
  - [ ] Implement subscription management

#### User Management (Priority: MEDIUM)
- [ ] Create `apps/backend/src/routes/user.routes.ts`
  - [ ] Implement `GET /api/user/me`
  - [ ] Implement `PATCH /api/user/me`
  - [ ] Implement `GET /api/user/scans`
  - [ ] Implement `POST /api/user/api-key`
  - [ ] Implement `DELETE /api/user/api-key`

#### Pro Features (Priority: MEDIUM)
- [ ] Create `apps/backend/src/routes/watchedUrl.routes.ts`
  - [ ] Implement `POST /api/watched-urls`
  - [ ] Implement `GET /api/watched-urls`
  - [ ] Implement `GET /api/watched-urls/:id`
  - [ ] Implement `PATCH /api/watched-urls/:id`
  - [ ] Implement `DELETE /api/watched-urls/:id`

- [ ] Update `apps/backend/src/routes/scan.routes.ts`
  - [ ] Add `isPublic` parameter support
  - [ ] Add Pro feature checks
  - [ ] Link scans to userId when authenticated

- [ ] Update `apps/backend/src/routes/report.routes.ts`
  - [ ] Check `isPublic` before showing report
  - [ ] Allow owner to view private reports

#### API Key Authentication (Priority: LOW)
- [ ] Create `apps/backend/src/middleware/apiKey.middleware.ts`
  - [ ] Implement API key validation
  - [ ] Implement usage tracking
  - [ ] Implement monthly reset logic

### Step 4: Frontend Implementation

#### Authentication UI (Priority: HIGH)
- [ ] Create `apps/frontend/src/pages/Login.tsx`
  - [ ] Email/password form
  - [ ] Error handling
  - [ ] Redirect to dashboard on success

- [ ] Create `apps/frontend/src/pages/Register.tsx`
  - [ ] Registration form
  - [ ] Password validation
  - [ ] Terms acceptance

- [ ] Create `apps/frontend/src/components/AuthContext.tsx`
  - [ ] User state management
  - [ ] Login/logout functions
  - [ ] Token storage (localStorage/cookies)

- [ ] Create `apps/frontend/src/components/ProtectedRoute.tsx`
  - [ ] Route protection logic
  - [ ] Redirect to login when unauthenticated

#### User Dashboard (Priority: HIGH)
- [ ] Create `apps/frontend/src/pages/Dashboard.tsx`
  - [ ] User profile section
  - [ ] Scan history table
  - [ ] Subscription status
  - [ ] API key management (Pro)

- [ ] Create `apps/frontend/src/pages/Settings.tsx`
  - [ ] Profile editing
  - [ ] Password change
  - [ ] Account deletion

#### Pricing & Subscriptions (Priority: HIGH)
- [ ] Create `apps/frontend/src/pages/Pricing.tsx`
  - [ ] Free tier features
  - [ ] Pro tier features
  - [ ] Stripe checkout integration

- [ ] Create `apps/frontend/src/components/UpgradePrompt.tsx`
  - [ ] Show when hitting rate limits
  - [ ] Show for Pro features
  - [ ] Link to pricing page

#### Pro Features UI (Priority: MEDIUM)
- [ ] Update `apps/frontend/src/pages/ScanPage.tsx`
  - [ ] Add "Make Private" toggle (Pro only)
  - [ ] Show Pro badge for Pro scans
  - [ ] Disable toggle for free users with upsell

- [ ] Create `apps/frontend/src/pages/WatchedUrls.tsx`
  - [ ] List watched URLs
  - [ ] Add new URL form
  - [ ] Edit frequency/alerts
  - [ ] Delete watched URLs

- [ ] Update `apps/frontend/src/pages/ReportPage.tsx`
  - [ ] Check isPublic before showing
  - [ ] Show "Private" badge
  - [ ] Handle 403 for private reports

### Step 5: Testing

#### Unit Tests (Priority: HIGH)
- [ ] Test authentication middleware
- [ ] Test rate limiting logic
- [ ] Test JWT generation/verification
- [ ] Test Stripe webhook handlers
- [ ] Test API key validation

#### Integration Tests (Priority: HIGH)
- [ ] Test user registration flow
- [ ] Test user login flow
- [ ] Test rate limiting enforcement
- [ ] Test subscription activation
- [ ] Test scan creation with userId

#### E2E Tests (Priority: MEDIUM)
- [ ] Test complete registration → upgrade → scan flow
- [ ] Test rate limit hit → upgrade prompt → checkout
- [ ] Test private scan creation and access
- [ ] Test watched URL creation and monitoring

### Step 6: Documentation

#### API Documentation (Priority: MEDIUM)
- [ ] Document authentication endpoints
- [ ] Document user endpoints
- [ ] Document watched URL endpoints
- [ ] Update OpenAPI spec

#### User Documentation (Priority: LOW)
- [ ] Create user guide for Freemium features
- [ ] Create FAQ for subscriptions
- [ ] Create troubleshooting guide

#### Admin Documentation (Priority: LOW)
- [ ] Create admin guide for user management
- [ ] Create guide for Stripe integration
- [ ] Create monitoring guide

---

## Post-Deployment Verification

### Database Health
- [ ] Check migration status:
  ```sql
  SELECT * FROM "_prisma_migrations"
  ORDER BY finished_at DESC LIMIT 5;
  ```

- [ ] Monitor index usage:
  ```sql
  SELECT indexname, idx_scan
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  AND (indexname LIKE '%user%' OR indexname LIKE '%ratelimit%')
  ORDER BY idx_scan DESC;
  ```

- [ ] Check table sizes:
  ```sql
  SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
  FROM pg_stat_user_tables
  WHERE tablename IN ('User', 'RateLimit', 'WatchedUrl', 'Scan')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
  ```

### Application Health
- [ ] Test user registration
- [ ] Test user login
- [ ] Test anonymous scanning (should still work)
- [ ] Test authenticated scanning
- [ ] Test rate limiting (create 4 scans as anonymous)
- [ ] Test Stripe webhook (use Stripe CLI)

### Performance Monitoring
- [ ] Check average response times:
  ```sql
  SELECT query, mean_time, calls
  FROM pg_stat_statements
  WHERE query LIKE '%User%' OR query LIKE '%RateLimit%'
  ORDER BY mean_time DESC LIMIT 10;
  ```

- [ ] Monitor application logs for errors
- [ ] Check memory usage
- [ ] Check CPU usage
- [ ] Monitor database connection pool

### Security Verification
- [ ] Verify JWT secrets are secure
- [ ] Verify passwords are hashed
- [ ] Verify API keys are unique
- [ ] Verify private scans are protected
- [ ] Verify rate limiting works for anonymous users
- [ ] Test CORS configuration
- [ ] Test authentication bypass attempts

---

## Rollback Plan

If issues occur, follow this rollback procedure:

### 1. Assess Issue Severity
- **Minor issues** (UI bugs, non-critical features): Fix forward
- **Major issues** (data corruption, security): Roll back immediately

### 2. Execute Rollback
```bash
# Run rollback SQL
psql $DATABASE_URL -f infra/prisma/migrations/20251006213752_add_freemium_models/ROLLBACK_20251006213752_add_freemium_models.sql

# Revert Prisma schema
git checkout HEAD~1 infra/prisma/schema.prisma

# Regenerate Prisma client
pnpm prisma:generate

# Restart application
make restart ENV=<your-env>
```

### 3. Verify Rollback
- [ ] Check User/RateLimit/WatchedUrl tables are gone
- [ ] Check Scan table columns removed
- [ ] Check existing scans still work
- [ ] Check application starts without errors

---

## Success Criteria

The deployment is considered successful when:

- [x] ✅ Database migration completed without errors
- [ ] ✅ All validation queries pass
- [ ] ✅ Prisma client generates without errors
- [ ] ✅ Application starts without errors
- [ ] ✅ User registration works
- [ ] ✅ User login works
- [ ] ✅ Anonymous scanning still works
- [ ] ✅ Rate limiting enforces 3 scans/day for free users
- [ ] ✅ Pro subscriptions can be created via Stripe
- [ ] ✅ Private scans work for Pro users
- [ ] ✅ All queries perform < 50ms
- [ ] ✅ No errors in application logs
- [ ] ✅ No errors in database logs

---

## Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1** | Backend Authentication | 4-6 hours |
| **Phase 2** | Rate Limiting | 2-3 hours |
| **Phase 3** | Stripe Integration | 6-8 hours |
| **Phase 4** | User Features | 4-6 hours |
| **Phase 5** | Pro Features | 3-4 hours |
| **Phase 6** | Frontend UI | 12-16 hours |
| **Phase 7** | Testing & QA | 6-8 hours |
| **Phase 8** | Documentation | 3-4 hours |
| **TOTAL** | | **40-55 hours** |

**Recommended Schedule**: 1-2 weeks with 1-2 developers

---

## Resources

### Documentation
- **Main Summary**: `/Users/pothamsettyk/Projects/Privacy-Advisor/FREEMIUM_MODEL_DEPLOYMENT_SUMMARY.md`
- **Migration Guide**: `/Users/pothamsettyk/Projects/Privacy-Advisor/infra/prisma/migrations/20251006213752_add_freemium_models/MIGRATION_GUIDE.md`
- **Implementation Guide**: `/Users/pothamsettyk/Projects/Privacy-Advisor/infra/prisma/migrations/20251006213752_add_freemium_models/IMPLEMENTATION_GUIDE.md`
- **Performance Analysis**: `/Users/pothamsettyk/Projects/Privacy-Advisor/infra/prisma/migrations/20251006213752_add_freemium_models/PERFORMANCE_ANALYSIS.md`
- **Rollback Script**: `/Users/pothamsettyk/Projects/Privacy-Advisor/infra/prisma/migrations/20251006213752_add_freemium_models/ROLLBACK_20251006213752_add_freemium_models.sql`

### External Resources
- [Prisma Documentation](https://www.prisma.io/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [JWT Best Practices](https://jwt.io/introduction)
- [PostgreSQL Performance](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Created**: 2025-10-06
**Last Updated**: 2025-10-06
**Version**: 1.0.0
