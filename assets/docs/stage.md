# Stage Environment Variables - Coolify
**Environment:** Stage (stage.geckoadvisor.com)
**Last Updated:** October 26, 2025

## ⚙️ Core Application Settings

```bash
# Node Environment
NODE_ENV=production
APP_ENV=stage

# Server Port (backend)
PORT=5000
BACKEND_PORT=5000
```

---

## 🔐 Security & Authentication

```bash
# JWT Secret (REQUIRED - Generate a secure random string)
# Generate with: openssl rand -base64 32
JWT_SECRET=REPLACE_WITH_SECURE_RANDOM_STRING_MIN_32_BYTES

# Admin API Key (for /api/admin endpoints)
# Generate with: openssl rand -hex 32
ADMIN_API_KEY=REPLACE_WITH_SECURE_ADMIN_KEY
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
FRONTEND_PUBLIC_URL=https://stage.geckoadvisor.com
STAGE_ORIGIN=https://stage.geckoadvisor.com
ALLOW_ORIGIN=https://stage.geckoadvisor.com

# Backend API URL
API_ORIGIN=https://api.stage.geckoadvisor.com
BACKEND_PUBLIC_URL=https://api.stage.geckoadvisor.com

# Worker URL (if exposed)
WORKER_PUBLIC_URL=https://worker.stage.geckoadvisor.com

# Additional CORS origins (comma-separated, optional)
CORS_EXTRA_ORIGINS=
```

---

## 🛡️ Cloudflare Turnstile (Bot Protection)

```bash
TURNSTILE_ENABLED=true
TURNSTILE_SECRET_KEY=0x4AAAAAAB8s35aT2tbEA3nz
TURNSTILE_SITE_KEY=0x4AAAAAAB8s3-9T6HX3lVDch2k1kf9vMJ0
```

---

## 📦 Hetzner Object Storage

```bash
OBJECT_STORAGE_ENABLED=true
OBJECT_STORAGE_ENDPOINT=https://hel1.your-objectstorage.com
OBJECT_STORAGE_REGION=eu-central
OBJECT_STORAGE_BUCKET=geckoadvisor-stage
OBJECT_STORAGE_ACCESS_KEY=DB3VV4OAQ5CU4LS3N4AQ
OBJECT_STORAGE_SECRET_KEY=Mtli1w9JAEhrb5su8sL6N6tuzECrSwZPKsMSJasH
OBJECT_STORAGE_REPORT_PREFIX=reports/
OBJECT_STORAGE_PUBLIC_URL=
OBJECT_STORAGE_FORCE_PATH_STYLE=true
OBJECT_STORAGE_SIGNED_URL_SECONDS=3600
```

---

## ⚡ Rate Limiting Configuration

```bash
# General rate limit (requests per minute)
RATE_LIMIT_PER_MINUTE=30

# Scan endpoint rate limit (more restrictive)
RATE_LIMIT_SCAN_PER_MINUTE=10

# Report endpoint rate limit (more permissive)
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

## 📧 SendGrid Email (Optional)

```bash
# SendGrid Configuration
SENDGRID_ENABLED=false
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@geckoadvisor.com

# Password reset URL
PASSWORD_RESET_URL=https://stage.geckoadvisor.com/reset-password
```

---

## 💳 Payment Providers (Optional - For Pro Tier)

```bash
# LemonSqueezy (Recommended)
LEMONSQUEEZY_ENABLED=false
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_VARIANT_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_CHECKOUT_REDIRECT_URL=https://stage.geckoadvisor.com/checkout/success

# Stripe (Legacy - Preserved but disabled)
STRIPE_ENABLED=false
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=

# Wallet Authentication (Solana)
WALLET_AUTH_ENABLED=true
WALLET_PRO_TOKEN_THRESHOLD=10000
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PRICKO_TOKEN_MINT=
PRICKO_TOKEN_LAUNCHED=false
```

---

## 🐛 Error Tracking (Optional)

```bash
# Sentry Configuration
SENTRY_DSN_BE=
SENTRY_ENVIRONMENT=stage
SENTRY_TRACES_SAMPLE_RATE=0.05
```

---

## 🔒 Content Security Policy

```bash
# CSP Report URI (optional)
CSP_REPORT_URI=

# CSP is configured automatically based on FRONTEND_PUBLIC_URL
# No additional CSP variables needed
```

---

## 📊 Logging

```bash
# Log level: debug, info, warn, error
LOG_LEVEL=info
```

---

## 🎯 Feature Flags

```bash
# Use test fixtures for .test domains (for testing only)
USE_FIXTURES=0
```

---

## 📝 Notes

### Required Variables (Must Set Before Deploy):
- ✅ `JWT_SECRET` - Generate with `openssl rand -base64 32`
- ✅ `ADMIN_API_KEY` - Generate with `openssl rand -hex 32`
- ✅ `TURNSTILE_SECRET_KEY` - From Cloudflare Turnstile dashboard
- ✅ `TURNSTILE_SITE_KEY` - From Cloudflare Turnstile dashboard
- ✅ `OBJECT_STORAGE_ACCESS_KEY` - From Hetzner Object Storage
- ✅ `OBJECT_STORAGE_SECRET_KEY` - From Hetzner Object Storage
- ✅ `OBJECT_STORAGE_ENDPOINT` - From Hetzner Object Storage
- ✅ `OBJECT_STORAGE_BUCKET` - Your bucket name

### Optional Variables (Can Enable Later):
- SendGrid (for password reset emails)
- LemonSqueezy (for Pro tier payments)
- Sentry (for error tracking)
- Wallet features (for token-gated Pro tier)

### Database & Redis:
- Default values work for Coolify Docker Compose setup
- No changes needed unless using external services

### CORS Configuration:
- `FRONTEND_PUBLIC_URL` must match your actual frontend domain
- `API_ORIGIN` must match your actual backend domain
- Add extra origins to `CORS_EXTRA_ORIGINS` if needed (comma-separated)

---

**Deployment Checklist:**
1. ✅ Replace all `REPLACE_WITH_*` placeholders
2. ✅ Verify Turnstile keys match Cloudflare dashboard
3. ✅ Verify Object Storage credentials are correct
4. ✅ Verify all URLs match your actual domains
5. ✅ Save environment variables in Coolify
6. ✅ Restart backend and worker services after updating
