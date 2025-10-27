# Production Environment Variables - Coolify
**Environment:** Production (geckoadvisor.com)
**Last Updated:** October 26, 2025

## ⚙️ Core Application Settings

```bash
# Node Environment
NODE_ENV=production
APP_ENV=production

# Server Port (backend)
PORT=5000
BACKEND_PORT=5000
```

---

## 🔐 Security & Authentication

```bash
# JWT Secret (REQUIRED - Generate a DIFFERENT secure random string than stage)
# Generate with: openssl rand -base64 32
JWT_SECRET=REPLACE_WITH_SECURE_RANDOM_STRING_MIN_32_BYTES_DIFFERENT_FROM_STAGE

# Admin API Key (for /api/admin endpoints)
# Generate with: openssl rand -hex 32
ADMIN_API_KEY=REPLACE_WITH_SECURE_ADMIN_KEY_DIFFERENT_FROM_STAGE
```

---

## 🗄️ Database & Cache

```bash
# PostgreSQL Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/privacy

# Redis (for BullMQ queue and caching)
REDIS_URL=redis://redis:6379
```

---

## 🌐 CORS & Public URLs

```bash
# Frontend URL
FRONTEND_PUBLIC_URL=https://geckoadvisor.com
STAGE_ORIGIN=https://geckoadvisor.com
ALLOW_ORIGIN=https://geckoadvisor.com

# Backend API URL
API_ORIGIN=https://api.geckoadvisor.com
BACKEND_PUBLIC_URL=https://api.geckoadvisor.com

# Worker URL (if exposed)
WORKER_PUBLIC_URL=https://worker.geckoadvisor.com

# Additional CORS origins (comma-separated, optional)
# Include www subdomain if used
CORS_EXTRA_ORIGINS=https://www.geckoadvisor.com
```

---

## 🛡️ Cloudflare Turnstile (Bot Protection)

```bash
TURNSTILE_ENABLED=true
TURNSTILE_SECRET_KEY=0x4AAAAAAB8sqHJ9YXEI3C2O
TURNSTILE_SITE_KEY=0x4AAAAAAB8sqAP95gn_G9nvSObb5oAitDU
```

---

## 📦 Hetzner Object Storage

```bash
OBJECT_STORAGE_ENABLED=true
OBJECT_STORAGE_ENDPOINT=https://hel1.your-objectstorage.com
OBJECT_STORAGE_REGION=eu-central
OBJECT_STORAGE_BUCKET=gekoshare-prod
OBJECT_STORAGE_ACCESS_KEY=OCGCF8TIAJGOVXOTPZ0E
OBJECT_STORAGE_SECRET_KEY=qIGlrZ4251ZGyAUXlV3o1t1QEx1snekR4CG9g6Qm
OBJECT_STORAGE_REPORT_PREFIX=reports/
OBJECT_STORAGE_PUBLIC_URL=
OBJECT_STORAGE_FORCE_PATH_STYLE=true
OBJECT_STORAGE_SIGNED_URL_SECONDS=3600
```

---

## ⚡ Rate Limiting Configuration

```bash
# General rate limit (requests per minute) - Stricter for production
RATE_LIMIT_PER_MINUTE=30

# Scan endpoint rate limit (more restrictive to prevent abuse)
RATE_LIMIT_SCAN_PER_MINUTE=10

# Report endpoint rate limit (more permissive for user experience)
RATE_LIMIT_REPORT_PER_MINUTE=30

# Rate limit window (milliseconds)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_SCAN_WINDOW_MS=60000
RATE_LIMIT_REPORT_WINDOW_MS=60000
```

---

## 🔄 Queue & Worker Settings

```bash
# BullMQ job retry configuration
WORKER_JOB_ATTEMPTS=3
WORKER_BACKOFF_MS=5000

# Cache TTL (milliseconds) - 15 minutes default
CACHE_TTL_MS=900000
```

---

## 📧 SendGrid Email (Recommended for Production)

```bash
# SendGrid Configuration
SENDGRID_ENABLED=true
SENDGRID_API_KEY=REPLACE_WITH_SENDGRID_API_KEY
SENDGRID_FROM_EMAIL=noreply@geckoadvisor.com

# Password reset URL
PASSWORD_RESET_URL=https://geckoadvisor.com/reset-password
```

---

## 💳 Payment Providers (For Pro Tier)

```bash
# LemonSqueezy (Recommended - Active)
LEMONSQUEEZY_ENABLED=true
LEMONSQUEEZY_API_KEY=REPLACE_WITH_LEMONSQUEEZY_API_KEY
LEMONSQUEEZY_STORE_ID=REPLACE_WITH_STORE_ID
LEMONSQUEEZY_VARIANT_ID=REPLACE_WITH_VARIANT_ID
LEMONSQUEEZY_WEBHOOK_SECRET=REPLACE_WITH_WEBHOOK_SECRET
LEMONSQUEEZY_CHECKOUT_REDIRECT_URL=https://geckoadvisor.com/checkout/success

# Stripe (Legacy - Preserved but disabled)
STRIPE_ENABLED=false
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=

# Wallet Authentication (Solana - For Token-Gated Pro)
WALLET_AUTH_ENABLED=true
WALLET_PRO_TOKEN_THRESHOLD=10000
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PRICKO_TOKEN_MINT=REPLACE_WHEN_TOKEN_LAUNCHES
PRICKO_TOKEN_LAUNCHED=false
```

---

## 🐛 Error Tracking (Recommended for Production)

```bash
# Sentry Configuration
SENTRY_DSN_BE=REPLACE_WITH_SENTRY_DSN
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

## 🔒 Content Security Policy

```bash
# CSP Report URI (optional - for monitoring CSP violations)
CSP_REPORT_URI=

# CSP is configured automatically based on FRONTEND_PUBLIC_URL
# No additional CSP variables needed
```

---

## 📊 Logging

```bash
# Log level: info (production), warn, error
# DO NOT use 'debug' in production (performance impact)
LOG_LEVEL=info
```

---

## 🎯 Feature Flags

```bash
# Use test fixtures for .test domains (MUST BE 0 IN PRODUCTION)
USE_FIXTURES=0
```

---

## 📝 Notes

### ⚠️ Critical Production Requirements:

**Security:**
- ✅ `JWT_SECRET` - MUST be different from stage, generate with `openssl rand -base64 32`
- ✅ `ADMIN_API_KEY` - MUST be different from stage, generate with `openssl rand -hex 32`
- ✅ All secrets MUST be stored in password manager, NEVER in git
- ✅ Rotate secrets periodically (every 90 days recommended)

**Bot Protection:**
- ✅ `TURNSTILE_ENABLED=true` - Required to prevent abuse
- ✅ Use "Invisible" mode for production (better UX)
- ✅ Monitor Cloudflare dashboard for blocked requests

**Object Storage:**
- ✅ Use separate production bucket (`gekoshare-prod`)
- ✅ Verify credentials are for production bucket only
- ✅ Monitor bucket size monthly (costs scale with storage)

**CORS:**
- ✅ `FRONTEND_PUBLIC_URL` must be exact production domain
- ✅ Include `www.geckoadvisor.com` in `CORS_EXTRA_ORIGINS` if used
- ✅ DO NOT include localhost or stage URLs

**Rate Limiting:**
- ✅ Start conservative (10 req/min for scans)
- ✅ Monitor and adjust based on real traffic patterns
- ✅ Consider Cloudflare edge rate limiting as additional layer

---

### Optional But Recommended:

**Email (SendGrid):**
- Enables password reset functionality
- Required for user notifications
- Cost: ~$15/month for 40k emails

**Error Tracking (Sentry):**
- Critical for production debugging
- Catch and fix issues before users report them
- Cost: Free tier available, ~$26/month for team plan

**Payment Processing (LemonSqueezy):**
- Only needed if monetizing with Pro tier
- Enable when ready to accept payments
- Cost: 5% + payment processing fees

---

### Database & Redis:
- Default values work for Coolify Docker Compose setup
- Consider managed services for high-traffic production:
  - Managed PostgreSQL (better backups, scaling)
  - Managed Redis (better reliability, clustering)

---

### Environment Comparison:

| Variable | Stage | Production |
|----------|-------|------------|
| `NODE_ENV` | production | production |
| `APP_ENV` | stage | production |
| `FRONTEND_PUBLIC_URL` | stage.geckoadvisor.com | geckoadvisor.com |
| `TURNSTILE_SECRET_KEY` | Different key | Different key |
| `OBJECT_STORAGE_BUCKET` | geckoadvisor-stage | gekoshare-prod |
| `JWT_SECRET` | Unique secret | DIFFERENT unique secret |
| `LOG_LEVEL` | info or debug | info (never debug) |
| `SENDGRID_ENABLED` | false | true |
| `SENTRY_ENABLED` | false | true |

---

## 🚀 Pre-Launch Checklist

Before deploying to production:

### Security & Secrets:
- [ ] All `REPLACE_WITH_*` placeholders replaced
- [ ] `JWT_SECRET` is different from stage
- [ ] `ADMIN_API_KEY` is different from stage
- [ ] All secrets stored in password manager
- [ ] No secrets in git history

### Infrastructure:
- [ ] Cloudflare DNS configured for production domain
- [ ] Cloudflare SSL/TLS set to "Full (strict)"
- [ ] Cloudflare WAF + Bot Fight Mode enabled
- [ ] Turnstile widget created for production domain
- [ ] Hetzner Object Storage bucket `gekoshare-prod` created
- [ ] Object Storage credentials verified

### Services:
- [ ] UptimeRobot monitors configured (frontend + backend only)
- [ ] Alert contacts added (email + Telegram)
- [ ] SendGrid configured (if using email features)
- [ ] Sentry configured (if using error tracking)

### Testing:
- [ ] End-to-end scan test completed successfully
- [ ] Report archival to object storage verified
- [ ] Turnstile challenge verified
- [ ] Rate limiting tested and tuned
- [ ] Health endpoints returning 200 OK

### Post-Deploy:
- [ ] Monitor logs for first 24 hours
- [ ] Watch UptimeRobot for downtime alerts
- [ ] Check Grafana metrics (CPU, memory, queue)
- [ ] Monitor Cloudflare firewall events
- [ ] Review Sentry for any errors

---

**Last Review Date:** October 26, 2025
**Reviewed By:** Development Team
**Next Review:** Before production deployment
