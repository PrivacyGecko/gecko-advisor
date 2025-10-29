# 🚀 Stage Deployment Checklist - Gecko Advisor

**Commit**: 8c4d05a  
**Branch**: stage  
**Status**: ✅ Pushed to origin/stage  
**Ready**: Yes - Complete freemium implementation with PrivacyGecko branding

---

## 📦 What's Being Deployed

### Major Features (83 files changed, 23,111+ lines)
- ✅ **Freemium Model**: FREE (3 scans/day) → PRO ($4.99/mo, unlimited)
- ✅ **Authentication**: JWT + bcrypt, email-only and full registration
- ✅ **Rate Limiting**: IP-based and user-based daily limits
- ✅ **PrivacyGecko Branding**: Complete brand identity with gecko theme
- ✅ **Domain Migration**: geckoadvisor.com (from privamule.com)
- ✅ **Dashboard**: User profile, scan history, subscription status
- ⏸️ **Stripe Integration**: Code ready but disabled for stage

---

## 🔧 Pre-Deployment Steps

### 1. DNS Configuration (CRITICAL)

**Set up these DNS records for geckoadvisor.com:**

```dns
# Primary domains
geckoadvisor.com           A      YOUR_STAGE_SERVER_IP
stage.geckoadvisor.com     A      YOUR_STAGE_SERVER_IP

# If using subdomains for API/Worker
stageapi.geckoadvisor.com  A      YOUR_STAGE_SERVER_IP
sworker.geckoadvisor.com   A      YOUR_STAGE_SERVER_IP
```

**Verify DNS propagation:**
```bash
nslookup stage.geckoadvisor.com
dig stage.geckoadvisor.com
```

### 2. SSL Certificates

**Option A: Let's Encrypt (Recommended)**
```bash
certbot certonly --webroot -w /var/www/html \
  -d stage.geckoadvisor.com

# Or if using Nginx directly
certbot --nginx -d stage.geckoadvisor.com
```

**Option B: Coolify Auto-SSL**
- Coolify will auto-provision SSL if domain is configured
- Ensure domain points to Coolify server

**Option C: Cloudflare**
- Add geckoadvisor.com to Cloudflare
- Set DNS to proxied (orange cloud)
- SSL/TLS mode: Full (strict)

### 3. Environment Variables

**Update Coolify/Docker environment variables:**

```bash
# Database (update with your actual values)
DATABASE_URL="postgresql://user:password@stage-db:5432/gecko_advisor"

# Redis
REDIS_URL="redis://stage-redis:6379"

# Authentication
JWT_SECRET="your-stage-jwt-secret-CHANGE-THIS-NOW"

# Domain Configuration
FRONTEND_URL="https://stage.geckoadvisor.com"
BASE_URL="https://stage.geckoadvisor.com"
BACKEND_PUBLIC_URL="https://stageapi.geckoadvisor.com"  # Optional
WORKER_PUBLIC_URL="https://sworker.geckoadvisor.com"    # Optional

# Environment
APP_ENV="stage"
NODE_ENV="production"

# Admin API key
ADMIN_API_KEY="your-stage-admin-key-CHANGE-THIS"

# Rate limiting (optional, defaults set)
RATE_LIMIT_PER_MINUTE=120
RATE_LIMIT_SCAN_PER_MINUTE=120
RATE_LIMIT_REPORT_PER_MINUTE=240

# Stripe - NOT NEEDED YET (disabled for stage)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_test_...
# STRIPE_PRICE_ID=price_test_...
```

---

## 🗄️ Database Migration

### Step 1: Backup Current Database (CRITICAL)

```bash
# SSH to your stage server
ssh your-stage-server

# Backup current database
pg_dump -h localhost -U postgres -d privacy_advisor > backup_before_freemium_$(date +%Y%m%d_%H%M%S).sql

# Or using Docker
docker exec your-postgres-container pg_dump -U postgres privacy_advisor > backup_before_freemium_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Prisma Migration

**If using Coolify:**
```bash
# SSH to Coolify server
ssh your-coolify-server

# Find backend container
docker ps | grep backend

# Run migration
docker exec YOUR_BACKEND_CONTAINER_ID \
  npx prisma migrate deploy --schema=/app/infra/prisma/schema.prisma

# Generate Prisma client
docker exec YOUR_BACKEND_CONTAINER_ID \
  npx prisma generate --schema=/app/infra/prisma/schema.prisma
```

**If using Docker Compose:**
```bash
cd /path/to/Privacy-Advisor

# Run migration
docker compose -f infra/docker/docker-compose.yml \
  -f infra/docker/docker-compose.stage.yml \
  exec backend npx prisma migrate deploy --schema=/app/infra/prisma/schema.prisma
```

### Step 3: Verify Migration

```bash
# Check migration status
docker exec YOUR_BACKEND_CONTAINER_ID \
  npx prisma migrate status --schema=/app/infra/prisma/schema.prisma

# Expected output: "Database schema is up to date!"
```

---

## 🚢 Deployment Steps

### Option A: Coolify Deployment

1. **Push to GitHub** (✅ Already done)
   ```bash
   git push origin stage  # ✅ Complete
   ```

2. **Trigger Coolify Deployment**
   - Go to Coolify dashboard
   - Select Gecko Advisor project
   - Click "Deploy" on stage environment
   - Or wait for auto-deploy if webhook configured

3. **Monitor Build Logs**
   - Watch for successful build
   - Check for TypeScript compilation success
   - Verify no errors in deployment

4. **Run Migration** (after deployment succeeds)
   ```bash
   # See "Database Migration" section above
   ```

### Option B: Manual Docker Compose Deployment

1. **Pull Latest Code**
   ```bash
   cd /path/to/Privacy-Advisor
   git pull origin stage
   ```

2. **Build & Start Services**
   ```bash
   # Build
   docker compose -f infra/docker/docker-compose.yml \
     -f infra/docker/docker-compose.stage.yml \
     build

   # Start
   docker compose -f infra/docker/docker-compose.yml \
     -f infra/docker/docker-compose.stage.yml \
     up -d
   ```

3. **Run Migration**
   ```bash
   # See "Database Migration" section above
   ```

---

## ✅ Post-Deployment Testing

### 1. Health Checks

```bash
# Backend health
curl https://stage.geckoadvisor.com/api/health

# Expected: { "status": "ok", ... }

# Recent reports (test database)
curl https://stage.geckoadvisor.com/api/reports/recent

# Expected: JSON array of recent scans
```

### 2. Frontend Verification

**Visit in browser:**
- https://stage.geckoadvisor.com

**Check:**
- [ ] Page loads without errors
- [ ] Gecko emoji (🦎) appears in header
- [ ] "Gecko Advisor by PrivacyGecko" branding visible
- [ ] Footer shows copyright "© 2025 PrivacyGecko"
- [ ] Hero section has tagline "Watch Over Your Privacy"

### 3. Authentication Flow

**Test Signup (Email Only)**:
```bash
curl -X POST https://stage.geckoadvisor.com/api/auth/create-account \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Expected: { "token": "...", "user": { ... } }
```

**Test Login**:
```bash
# First register with password
curl -X POST https://stage.geckoadvisor.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"Test User"}'

# Then login
curl -X POST https://stage.geckoadvisor.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Expected: { "token": "...", "user": { ... } }
```

**Test /me endpoint**:
```bash
TOKEN="your-token-from-above"

curl https://stage.geckoadvisor.com/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Expected: { "user": { "id": "...", "email": "...", "subscription": "FREE", ... } }
```

### 4. Rate Limiting

**Test Anonymous Scanning (3/day limit)**:
```bash
# First scan (should work)
curl -X POST https://stage.geckoadvisor.com/api/v2/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# Expected: { "scanId": "...", "slug": "...", "rateLimit": { "scansUsed": 1, "scansRemaining": 2, ... } }

# Repeat 2 more times (should work)
# 4th scan should return 429 error
```

**Test Rate Limit Exceeded**:
```bash
# After 3 scans, 4th scan should fail
curl -X POST https://stage.geckoadvisor.com/api/v2/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://blocked.com"}'

# Expected: {
#   "type": "rate_limit_exceeded",
#   "title": "Daily Limit Reached",
#   "status": 429,
#   "detail": "You have reached the daily limit of 3 free scans.",
#   "upgradeUrl": "/pricing"
# }
```

### 5. Dashboard Access

**In browser:**
1. Visit https://stage.geckoadvisor.com
2. Click "Sign Up"
3. Create account with email
4. Should auto-login and redirect to home
5. Click user email in header → "Dashboard"
6. Should show:
   - [ ] User email
   - [ ] Subscription tier (FREE)
   - [ ] Scan history table (empty initially)
   - [ ] "Upgrade to Pro" CTA (visible but won't work yet - Stripe disabled)

### 6. Branding Verification

**Check these elements:**
- [ ] Browser tab shows "Gecko Advisor - Privacy Policy Scanner by PrivacyGecko"
- [ ] Header logo is gecko emoji (🦎)
- [ ] Header text: "Gecko Advisor" with "by PrivacyGecko" subtitle
- [ ] Footer copyright: "© 2025 PrivacyGecko"
- [ ] Footer tagline: "Watch Over Your Privacy"
- [ ] Green accent color (emerald-600) on CTAs
- [ ] Mobile responsive design works

### 7. Database Verification

```bash
# Connect to database
docker exec -it YOUR_POSTGRES_CONTAINER psql -U postgres -d privacy_advisor

# Check new tables exist
\dt

# Expected to see: User, RateLimit, WatchedUrl tables

# Check for users
SELECT id, email, subscription, "subscriptionStatus" FROM "User" LIMIT 5;

# Check rate limits
SELECT * FROM "RateLimit" ORDER BY "createdAt" DESC LIMIT 10;

# Exit
\q
```

---

## 🧪 Manual Pro Testing (Optional)

Since Stripe is disabled, you can manually promote users to Pro to test Pro features:

### Promote User to Pro

```sql
-- Connect to database
docker exec -it YOUR_POSTGRES_CONTAINER psql -U postgres -d privacy_advisor

-- Promote user
UPDATE "User" 
SET 
  subscription = 'PRO',
  "subscriptionStatus" = 'ACTIVE',
  "subscriptionEndsAt" = NOW() + INTERVAL '30 days'
WHERE email = 'test@example.com';

-- Verify
SELECT id, email, subscription, "subscriptionStatus", "subscriptionEndsAt" 
FROM "User" 
WHERE email = 'test@example.com';
```

### Test Pro Features

**Login as Pro user:**
```bash
# Get token for Pro user
TOKEN=$(curl -s -X POST https://stage.geckoadvisor.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.token')

# Test unlimited scans (no rate limit)
curl -X POST https://stage.geckoadvisor.com/api/v2/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url":"https://example.com"}'

# Expected: { "scanId": "...", "rateLimit": null }
# Note: rateLimit is null for Pro users
```

**In browser:**
- [ ] Login as Pro user
- [ ] Should see "✨ Unlimited scans" badge instead of rate limit counter
- [ ] Can scan unlimited times without 429 error
- [ ] Dashboard shows 90-day scan history (vs 7 days for free)

---

## ⚠️ Known Issues & Workarounds

### Issue: "Upgrade to Pro" buttons don't work
**Expected**: Stripe is disabled for stage deployment  
**Workaround**: Promote users manually in database (see above)

### Issue: Batch scanning endpoint returns 404
**Expected**: Batch routes are disabled (commented out in server.ts)  
**Workaround**: Will be enabled when Stripe is configured

### Issue: API key generation endpoint returns 404
**Expected**: API routes are disabled (commented out in server.ts)  
**Workaround**: Generate API keys manually in database if needed

### Issue: Email not sending
**Expected**: Email service not configured yet  
**Action**: Set up SendGrid/Mailgun for noreply@geckoadvisor.com

---

## 🐛 Troubleshooting

### Database Connection Errors

```bash
# Check database is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Test connection
docker exec YOUR_BACKEND_CONTAINER \
  npx prisma db execute --stdin --schema=/app/infra/prisma/schema.prisma <<< "SELECT 1;"
```

### Migration Failures

```bash
# Check migration status
docker exec YOUR_BACKEND_CONTAINER \
  npx prisma migrate status --schema=/app/infra/prisma/schema.prisma

# If "drift detected", reset database (ONLY IN STAGE)
docker exec YOUR_BACKEND_CONTAINER \
  npx prisma migrate reset --schema=/app/infra/prisma/schema.prisma --skip-seed

# Then redeploy migration
docker exec YOUR_BACKEND_CONTAINER \
  npx prisma migrate deploy --schema=/app/infra/prisma/schema.prisma
```

### CORS Errors

```bash
# Check allowed origins in environment
docker exec YOUR_BACKEND_CONTAINER env | grep ALLOW_ORIGIN

# Should include: stage.geckoadvisor.com
# Update if missing
```

### 404 on Auth Endpoints

```bash
# Check backend logs
docker logs YOUR_BACKEND_CONTAINER -f

# Verify auth routes are registered
docker exec YOUR_BACKEND_CONTAINER \
  grep -r "authRouter" /app/dist/server.js
```

---

## 📊 Success Metrics

After deployment, verify these metrics:

- [ ] **Health Check**: https://stage.geckoadvisor.com/api/health returns 200 OK
- [ ] **Signup Works**: Can create new accounts
- [ ] **Login Works**: Can authenticate with credentials
- [ ] **Rate Limiting Works**: 4th scan returns 429 error
- [ ] **Branding Correct**: Gecko Advisor branding visible
- [ ] **Dashboard Accessible**: Can view user dashboard
- [ ] **Scan History Works**: Scans appear in history
- [ ] **Mobile Responsive**: Works on mobile devices
- [ ] **Zero Console Errors**: No JavaScript errors in browser console
- [ ] **Database Migration**: All new tables exist

---

## 📞 Support & Rollback

### If Deployment Fails

**Rollback to previous version:**
```bash
# Find previous commit
git log --oneline -5

# Rollback (replace COMMIT_HASH)
git reset --hard PREVIOUS_COMMIT_HASH
git push origin stage --force

# Restore database backup
pg_restore -h localhost -U postgres -d privacy_advisor backup_before_freemium_*.sql
```

### Get Help

**Documentation**:
- `DEPLOYMENT_READY.md` - Complete deployment guide
- `STAGE_DEPLOYMENT.md` - Stage-specific instructions
- `FREEMIUM_IMPLEMENTATION_COMPLETE.md` - Full feature list

**Logs**:
```bash
# Backend logs
docker logs YOUR_BACKEND_CONTAINER -f --tail 100

# Frontend logs (if separate container)
docker logs YOUR_FRONTEND_CONTAINER -f --tail 100

# All services
docker compose -f infra/docker/docker-compose.yml \
  -f infra/docker/docker-compose.stage.yml logs -f
```

---

## ✅ Deployment Checklist Summary

**Pre-Deployment**:
- [ ] DNS configured (stage.geckoadvisor.com)
- [ ] SSL certificate obtained
- [ ] Environment variables updated
- [ ] Database backup completed

**Deployment**:
- [x] Code pushed to stage branch (commit 8c4d05a)
- [ ] Coolify/Docker deployment triggered
- [ ] Build successful (check logs)
- [ ] Migration executed successfully
- [ ] Prisma client generated

**Post-Deployment**:
- [ ] Health check passes
- [ ] Frontend loads correctly
- [ ] Branding appears correctly
- [ ] Signup flow works
- [ ] Login flow works
- [ ] Rate limiting enforced
- [ ] Dashboard accessible
- [ ] Database tables verified
- [ ] Mobile responsive verified

**Optional**:
- [ ] Pro features tested (manual DB promotion)
- [ ] Email service configured
- [ ] Analytics connected
- [ ] Monitoring set up

---

**Status**: 🚀 **Ready for Stage Deployment**  
**Next**: Complete pre-deployment steps, then deploy!

**Timeline Estimate**:
- DNS setup: 5-10 min (then wait 1-24h for propagation)
- SSL certificate: 2-5 min
- Environment config: 5 min
- Deployment: 5-10 min
- Migration: 2-5 min
- Testing: 15-30 min

**Total**: ~30-60 min active work + DNS propagation time
