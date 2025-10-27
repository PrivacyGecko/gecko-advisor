# Stage Deployment Configuration

## Overview

Stage deployment has been configured to run **without Stripe integration**. This allows testing of core freemium features (authentication, rate limiting, scanning) before adding payment processing.

## Changes Made

### Backend: Stripe Routes Disabled

**File**: `apps/backend/src/server.ts`

**Changes**:
1. Commented out Stripe route imports (lines 17-20)
2. Commented out Stripe webhook raw body parser (lines 73-78)
3. Commented out Pro tier route registration (lines 141-143):
   - `/api/stripe` - Stripe checkout and webhooks
   - `/api/scan/batch` - Batch scanning (Pro feature)
   - `/api/api-keys` - API key management (Pro feature)

**Note**: All code remains in the codebase. Simply uncomment these lines when Stripe is configured.

## What Works in Stage

### ✅ Fully Functional
- **Authentication**: Signup, login, logout
- **Rate Limiting**: 3 scans/day for free users
- **Scanning**: Single URL scans with rate limit tracking
- **Dashboard**: User profile, scan history (7 days for free users)
- **Frontend UI**: All auth flows, modals, banners

### ⚠️ Temporarily Disabled
- **Stripe Checkout**: "Upgrade to Pro" buttons won't work
- **Batch Scanning**: POST /api/scan/batch endpoint unavailable
- **API Keys**: POST /api/api-keys/generate endpoint unavailable
- **Customer Portal**: Subscription management unavailable

## Testing Pro Features Without Stripe

You can manually promote users to Pro tier in the database to test Pro features:

### 1. Promote User to Pro
```sql
UPDATE "User" 
SET 
  subscription = 'PRO',
  "subscriptionStatus" = 'ACTIVE',
  "subscriptionEndsAt" = NOW() + INTERVAL '30 days'
WHERE email = 'test@example.com';
```

### 2. Test Pro Features
With a Pro user, you can test:
- ✅ Unlimited scans (no rate limit)
- ✅ "✨ Unlimited scans" badge in UI
- ✅ Scan history (90 days instead of 7)
- ✅ URGENT queue priority
- ❌ Batch scanning (endpoint disabled)
- ❌ API key generation (endpoint disabled)

### 3. Generate Test API Key Manually
```sql
UPDATE "User"
SET
  "apiKey" = 'pa_test_' || md5(random()::text),
  "apiCallsMonth" = 0,
  "apiResetAt" = NOW() + INTERVAL '30 days'
WHERE email = 'test@example.com';

-- View the key
SELECT email, "apiKey" FROM "User" WHERE email = 'test@example.com';
```

## Environment Variables for Stage

### Required (Currently Used)
```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/privacy_advisor"

# Redis
REDIS_URL="redis://host:6379"

# Authentication
JWT_SECRET="your-stage-jwt-secret"

# Frontend
FRONTEND_URL="https://stage.geckoadvisor.com"

# Optional
APP_ENV="stage"
ADMIN_API_KEY="your-stage-admin-key"
```

### Not Required Yet (Stripe)
```bash
# These are NOT needed for stage deployment
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_test_...
# STRIPE_PRICE_ID=price_test_...
```

## Enabling Stripe Later

When ready to enable Stripe in stage:

### 1. Set Up Stripe Test Mode
1. Create product in Stripe Dashboard: "Gecko Advisor Pro" at $4.99/month
2. Copy price ID to environment variable
3. Set up webhook endpoint: `https://stage.geckoadvisor.com/api/stripe/webhook`
4. Select events: `checkout.session.completed`, `customer.subscription.*`
5. Copy webhook secret

### 2. Update Environment Variables
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
STRIPE_PRICE_ID=price_test_...
```

### 3. Uncomment Code in server.ts
```typescript
// Line 17-20: Uncomment imports
import { stripeRouter } from "./routes/stripe.js";
import { batchRouter } from "./routes/batch.js";
import { apiRouter } from "./routes/api.js";

// Line 73-78: Uncomment webhook middleware
app.use('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req, _res, next) => {
  (req as any).rawBody = req.body;
  next();
});

// Line 141-143: Uncomment route registration
app.use('/api/stripe', stripeRouter);
app.use('/api/scan/batch', batchRouter);
app.use('/api/api-keys', apiRouter);
```

### 4. Redeploy
```bash
# Rebuild and deploy
cd apps/backend
pnpm build
# Deploy to stage
```

### 5. Test Stripe Flow
```bash
# Start webhook forwarding (local testing)
stripe listen --forward-to https://stage.geckoadvisor.com/api/stripe/webhook

# Test checkout with test card: 4242 4242 4242 4242
```

## Testing Checklist for Stage

### Phase 1-2: Auth & Database
- [ ] User signup (email only) works
- [ ] Full registration works
- [ ] Login returns JWT token
- [ ] Token persists in localStorage
- [ ] Auto-login on page refresh
- [ ] Logout clears session

### Phase 3: Rate Limiting
- [ ] Anonymous: 3 scans work, 4th returns 429
- [ ] Banner shows "X scans remaining today"
- [ ] Reset time displayed correctly
- [ ] Authenticated users tracked by user ID

### Phase 4: Frontend UI
- [ ] Header shows login/signup for guests
- [ ] Header shows user dropdown when logged in
- [ ] Dashboard accessible only when authenticated
- [ ] Dashboard shows scan history (7 days)
- [ ] Rate limit banner updates after scan

### Phase 5: Pro Features (Manual)
- [ ] Manually promoted Pro user sees "Unlimited" badge
- [ ] Pro user can scan unlimited times
- [ ] Pro user scan history shows 90 days
- [ ] Batch/API endpoints return 404 (expected, routes disabled)

## Known Limitations

### Stripe Routes Disabled
- `/api/stripe/create-checkout` → 404
- `/api/stripe/webhook` → 404
- `/api/stripe/create-portal` → 404
- `/api/stripe/subscription` → 404

### Pro Feature Routes Disabled
- `/api/scan/batch` → 404
- `/api/scan/batch/:batchId/status` → 404
- `/api/api-keys/generate` → 404
- `/api/api-keys/usage` → 404

### Frontend "Upgrade" Buttons
These will attempt to call Stripe endpoints and fail. Options:
1. **Option A**: Hide upgrade buttons in stage
2. **Option B**: Show message "Stripe coming soon"
3. **Option C**: Keep buttons, show error message on click

## Troubleshooting

### Issue: "Cannot find module './routes/stripe.js'"
**Cause**: Imports are not commented out
**Fix**: Ensure lines 17-20 in server.ts are commented

### Issue: Rate limiting not working
**Cause**: RateLimit table missing or empty
**Fix**: Run migration, check database

### Issue: Auth token not persisting
**Cause**: Frontend localStorage not saving token
**Fix**: Check browser console for errors

### Issue: Dashboard shows "Not authenticated"
**Cause**: Token expired or invalid
**Fix**: Login again, check JWT_SECRET is set

## Deployment Commands

### Build for Stage
```bash
# Backend
cd apps/backend
pnpm build

# Frontend
cd apps/frontend
pnpm build
```

### Database Migration
```bash
cd infra/prisma
npx prisma migrate deploy --schema=./schema.prisma
npx prisma generate --schema=./schema.prisma
```

### Start Services
```bash
# Backend (production mode)
cd apps/backend
NODE_ENV=production pnpm start

# Frontend (serve build with nginx/caddy)
# See infra/docker/nginx.conf for config
```

## Next Steps

1. ✅ Deploy to stage without Stripe
2. ✅ Test all auth flows
3. ✅ Test rate limiting (3/day)
4. ✅ Test Dashboard and scan history
5. ⏳ Manually test Pro features (promote users in DB)
6. ⏳ Validate UI/UX with real users
7. ⏳ Configure Stripe test mode
8. ⏳ Enable Stripe routes and test checkout
9. ⏳ Production deployment with Stripe

---

**Status**: Stage deployment ready without Stripe ✅  
**Stripe Integration**: Commented out, ready to enable when needed  
**Core Features**: Fully functional (auth, rate limiting, scanning)  
**Pro Features**: Testable via manual DB updates
