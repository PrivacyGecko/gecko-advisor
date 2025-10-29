# Phase 1 Setup - Next Steps Guide
**Date:** October 26, 2025
**Status:** Infrastructure configuration in progress

## ✅ Completed Setup

- ✅ Domain migrated to Cloudflare
- ✅ UptimeRobot URLs added for monitoring
- ✅ Hetzner Object Storage bucket created (`gekoshare-stage`)

---

## 🔧 Remaining Setup Tasks (In Order)

### Step 1: Configure Cloudflare Settings (15-20 minutes)

#### 1.1 SSL/TLS Configuration
**Location:** Cloudflare Dashboard → SSL/TLS

1. **Set SSL/TLS encryption mode:**
   - Navigate to SSL/TLS → Overview
   - Set encryption mode to **"Full (strict)"**
   - This ensures end-to-end encryption between Cloudflare and your origin server

2. **Force HTTPS redirects:**
   - Navigate to SSL/TLS → Edge Certificates
   - Enable **"Always Use HTTPS"**
   - This redirects all HTTP requests to HTTPS automatically

3. **Enable Automatic HTTPS Rewrites:**
   - In Edge Certificates, enable **"Automatic HTTPS Rewrites"**
   - Helps prevent mixed content warnings

#### 1.2 CDN & Caching Configuration
**Location:** Cloudflare Dashboard → Caching

1. **Set caching level:**
   - Navigate to Caching → Configuration
   - Set Caching Level to **"Standard"**

2. **Create cache rules for static assets:**
   - Navigate to Caching → Cache Rules
   - Create a new rule:
     - **Rule name:** `Cache Static Assets`
     - **When incoming requests match:**
       - Field: `File extension`
       - Operator: `is in`
       - Value: `jpg, jpeg, png, gif, svg, ico, css, js, woff, woff2, ttf`
     - **Then:**
       - Cache eligibility: `Eligible for cache`
       - Edge TTL: `1 day` (86400 seconds)
       - Browser TTL: `4 hours` (14400 seconds)

#### 1.3 WAF (Web Application Firewall) Configuration
**Location:** Cloudflare Dashboard → Security

1. **Enable WAF Managed Rules:**
   - Navigate to Security → WAF
   - Click "Deploy a managed ruleset"
   - Enable **"Cloudflare Managed Ruleset"**
   - Set action to **"Block"** for high-severity rules

2. **Enable Bot Fight Mode:**
   - Navigate to Security → Bots
   - Enable **"Bot Fight Mode"** (free tier)
   - This provides basic bot protection before Turnstile

3. **Create Rate Limiting Rule (Edge Protection):**
   - Navigate to Security → WAF → Rate limiting rules
   - Create new rule:
     - **Rule name:** `Scan Endpoint Protection`
     - **When incoming requests match:**
       - Field: `URI Path`
       - Operator: `contains`
       - Value: `/api/v2/scan`
     - **With the same characteristics:**
       - Characteristic: `IP`
     - **Rate:**
       - Requests: `15`
       - Period: `60 seconds` (1 minute)
     - **Then:**
       - Action: `Block`
       - Duration: `60 seconds`

#### 1.4 DNS Verification
**Location:** Cloudflare Dashboard → DNS

Verify the following DNS records exist and are **proxied** (orange cloud):

```
Type    Name                Value                       Proxy Status
A       stage               65.108.148.246              Proxied (🟠)
CNAME   *.stage             stage.geckoadvisor.com      Proxied (🟠)
A       www                 65.108.148.246              Proxied (🟠)
A       @                   65.108.148.246              Proxied (🟠)
```

**Why proxied?** This enables Cloudflare's CDN, WAF, and bot protection.

---

### Step 2: Create Cloudflare Turnstile Widget (10 minutes)

**Location:** Cloudflare Dashboard → Turnstile

1. **Navigate to Turnstile:**
   - Go to your Cloudflare account
   - Select "Turnstile" from the left sidebar
   - If not visible, ensure your account has access (free tier includes Turnstile)

2. **Create a new site:**
   - Click **"Add site"**
   - Fill in the details:
     - **Site name:** `GeckoAdvisor Stage` (or `GeckoAdvisor Production`)
     - **Domain:** `stage.geckoadvisor.com` (or `geckoadvisor.com` for prod)
     - **Widget Mode:**
       - For staging: **"Managed"** (shows challenge when needed)
       - For production: **"Invisible"** (no UI unless suspicious)

3. **Copy the credentials:**
   ```
   Site Key: 0x4AAAAAAB8sqHJ9YXEI3C2O
   Secret Key: 0x4AAAAAAB8sqAP95gn_G9nvSObb5oAitDU
   ```

   **⚠️ IMPORTANT:** Keep the Secret Key secure! Never commit to git.

4. **Configure widget settings (optional):**
   - **Appearance:** Light or Dark (auto-detect recommended)
   - **Challenge difficulty:** Default
   - **Data storage:** Cloudflare only (GDPR compliant)

5. **Test the widget:**
   - Use the "Test Mode" to verify integration before going live
   - Test mode always returns success for easier debugging

---

### Step 3: Configure Hetzner Object Storage (15 minutes)

**Location:** Hetzner Cloud Console → Object Storage

#### 3.1 Verify Bucket Details

Your bucket: `gekoshare-stage`

1. **Check bucket region:**
   - Should be `eu-central` (Frankfurt) for best performance with Hetzner servers
   - If different, note the exact region for environment variables

2. **Get bucket endpoint:**
   - The endpoint format should be: `https://{bucket}.fsn1.your-objectstorage.com`
   - Or: `https://fsn1.your-objectstorage.com` (with path-style access)
   - Find this in: Object Storage → Buckets → gekoshare-stage → Settings

#### 3.2 Generate Access Keys

1. **Create access credentials:**
   - Navigate to Object Storage → Keys
   - Click "Generate new key"
   - **Key name:** `geckoadvisor-stage-backend`
   - **Permissions:** Read & Write
   - **Bucket scope:** Select `gekoshare-stage`

2. **Copy and save the credentials:**
   ```
   Access Key ID: ABC123...
   Secret Access Key: xyz789...
   ```

   **⚠️ CRITICAL:** Save these immediately! The secret key is only shown once.

#### 3.3 Report Retention Policy

**Decision:** Keep all reports indefinitely in Object Storage (no automatic deletion).

**What this means:**
- ✅ All scan reports will be archived permanently
- ✅ Easier data analysis and historical tracking
- ✅ No complex cleanup job needed
- ⚠️ Storage costs will grow over time (monitor monthly)

**Cost Monitoring:**
- Monitor bucket size in Hetzner Console → Object Storage → gekoshare-stage
- First 1GB is free, then ~€0.005/GB/month (~₹0.50/GB/month)
- Estimate: 1000 reports ≈ 50-100MB, costs ~₹25-50/month

**Future cleanup (if needed):**
- Can manually delete old reports via Hetzner Console
- Or implement scheduled cleanup job later if costs become an issue

#### 3.4 Optional: Enable CDN/Public Access

If you want faster read access without signed URLs:

1. **Make bucket public (optional):**
   - Navigate to Bucket Settings → Access Control
   - Enable **"Public read access"**
   - ⚠️ Only do this if you want reports to be publicly accessible without authentication

2. **Get public URL:**
   - If enabled, public URL format: `https://{bucket}.fsn1.your-objectstorage.com/reports/{scanId}.json`
   - Use this for `OBJECT_STORAGE_PUBLIC_URL` environment variable

**Recommendation for Stage:** Keep bucket private, use signed URLs (more secure)

---

### Step 4: Update Stage Environment Variables (10 minutes)

#### 4.1 Prepare Environment Variable Values

Create a secure note with these values (use a password manager):

```bash
# Cloudflare Turnstile
TURNSTILE_ENABLED=true
TURNSTILE_SECRET_KEY=0x4AAA...CCCC  # From Step 2
TURNSTILE_SITE_KEY=0x4AAA...BBBB    # From Step 2

# Hetzner Object Storage
OBJECT_STORAGE_ENABLED=true
OBJECT_STORAGE_ENDPOINT=https://fsn1.your-objectstorage.com  # Replace with actual endpoint
OBJECT_STORAGE_REGION=eu-central
OBJECT_STORAGE_BUCKET=gekoshare-stage
OBJECT_STORAGE_ACCESS_KEY=ABC123...          # From Step 3
OBJECT_STORAGE_SECRET_KEY=xyz789...          # From Step 3
OBJECT_STORAGE_REPORT_PREFIX=reports/
OBJECT_STORAGE_PUBLIC_URL=                   # Leave empty if using signed URLs
OBJECT_STORAGE_FORCE_PATH_STYLE=true
OBJECT_STORAGE_SIGNED_URL_SECONDS=3600
```

#### 4.2 Deploy to Coolify Stage Environment

**Option A: Via Coolify Web UI (Recommended)**

1. Navigate to your Coolify dashboard
2. Go to your Gecko Advisor stage application
3. Click "Environment Variables"
4. Add/update the variables listed above
5. Click "Save"
6. Restart the backend and worker services

**Option B: Via SSH (Advanced)**

```bash
# SSH to server
ssh root@65.108.148.246

# Navigate to application directory
cd /data/coolify/applications/hccowk8cc4wowwkw8wok0k0g

# Edit .env file
nano .env

# Add the variables from 4.1
# Save with Ctrl+X, then Y, then Enter

# Restart services
docker compose -f docker-compose.stage.yml restart backend worker
```

#### 4.3 Verify Environment Variables Are Loaded

```bash
# Check backend logs for successful initialization
docker logs -f backend-eo8skkwsw8oc4gc00cowkc40 | grep -i "object storage\|turnstile"

# You should see:
# "Object storage initialized" or "Object storage disabled"
# "Turnstile service initialized" or "Turnstile disabled"
```

---

### Step 5: Configure UptimeRobot Monitors (5 minutes)

**Location:** UptimeRobot Dashboard → Add New Monitor

You mentioned you've added URLs - let's verify the configuration:

#### Monitor 1: Frontend Health Check
```
Monitor Type: HTTPS
Friendly Name: GeckoAdvisor Stage - Frontend
URL: https://stage.geckoadvisor.com/healthz
Monitoring Interval: 3 minutes (free tier) or 1 minute (Pro)
Monitor Timeout: 30 seconds
Alert Contacts: [Your email/Telegram]
```

#### Monitor 2: Backend API Health Check
```
Monitor Type: HTTPS
Friendly Name: GeckoAdvisor Stage - Backend API
URL: https://api.stage.geckoadvisor.com/api/health
Monitoring Interval: 3 minutes
Monitor Timeout: 30 seconds
Alert Contacts: [Your email/Telegram]
```

#### Monitor 3: Worker Health Check (if exposed)
```
Monitor Type: HTTPS
Friendly Name: GeckoAdvisor Stage - Worker
URL: https://worker.stage.geckoadvisor.com/health
Monitoring Interval: 3 minutes
Monitor Timeout: 30 seconds
Alert Contacts: [Your email/Telegram]
```

**Note:** If worker health endpoint is not exposed via nginx, you can skip this monitor or use a port-based monitor if the port is publicly accessible.

#### Configure Alert Settings

For each monitor:
1. Click on monitor → "Edit"
2. Go to "Alert Contacts"
3. Add your email and/or Telegram
4. Set "Alert After" to **2 failures** (prevents false positives)
5. Enable "Send alerts even when down" and "Send alerts when back up"

---

### Step 6: Test the Complete Integration (20 minutes)

#### 6.1 Test Object Storage Integration

1. **Trigger a test scan via API:**
   ```bash
   curl -X POST https://api.stage.geckoadvisor.com/api/v2/scan \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://example.com",
       "turnstileToken": "XXXX.DUMMY.TESTNET.TOKEN"
     }'
   ```

2. **Check backend logs for object storage upload:**
   ```bash
   # Via Coolify UI → Logs, or:
   docker logs -f backend-eo8skkwsw8oc4gc00cowkc40 | grep "object storage"

   # Should see: "Report archived to object storage" or similar
   ```

3. **Verify file exists in Hetzner bucket:**
   - Navigate to Hetzner Object Storage → Buckets → gekoshare-stage
   - Check `reports/` folder for new JSON files
   - File should be named like `reports/{scanId}.json`

4. **Test report retrieval:**
   ```bash
   curl https://api.stage.geckoadvisor.com/api/v2/report/{slug}

   # Should return report data fetched from object storage
   ```

#### 6.2 Test Turnstile Integration

**⚠️ Important:** Turnstile requires a real token from the frontend widget. Testing via curl won't work without a valid token.

**Option A: Test via Frontend (Recommended)**

1. **Add Turnstile widget to frontend scan form:**
   - Update `apps/frontend` to include Turnstile widget
   - Use the Site Key from Step 2
   - Submit a scan through the UI

2. **Verify in backend logs:**
   ```bash
   docker logs -f backend-eo8skkwsw8oc4gc00cowkc40 | grep -i turnstile

   # Should see: "Turnstile verification succeeded" or "failed"
   ```

**Option B: Use Turnstile Test Mode**

1. In Cloudflare Turnstile dashboard, enable "Test Mode"
2. Use the test token provided by Cloudflare
3. Send API request with test token
4. Disable test mode after verification

#### 6.3 Test Rate Limiting

1. **Test scan endpoint rate limit:**
   ```bash
   # Send 15 requests rapidly
   for i in {1..15}; do
     curl -X POST https://api.stage.geckoadvisor.com/api/v2/scan \
       -H "Content-Type: application/json" \
       -d '{"url": "https://example.com"}'
     echo "Request $i"
   done

   # Requests 11-15 should return 429 Too Many Requests
   ```

2. **Verify rate limit response:**
   ```json
   {
     "error": "rate_limited",
     "message": "Too many requests, please try again later",
     "retryAfterMs": 60000,
     "retryAfterSeconds": 60
   }
   ```

3. **Check Cloudflare edge rate limiting:**
   - Navigate to Cloudflare Dashboard → Security → Events
   - Should see blocked requests after 15 requests/minute

#### 6.4 Test UptimeRobot Monitoring

1. **Verify monitors are active:**
   - Go to UptimeRobot dashboard
   - All monitors should show "Up" status with green checkmarks

2. **Test alert notification (optional):**
   - Temporarily stop backend container:
     ```bash
     docker stop backend-eo8skkwsw8oc4gc00cowkc40
     ```
   - Wait 3-5 minutes for UptimeRobot to detect downtime
   - Verify you receive email/Telegram alert
   - Restart container:
     ```bash
     docker start backend-eo8skkwsw8oc4gc00cowkc40
     ```
   - Verify "back up" alert is received

#### 6.5 Test End-to-End Scan Flow

1. **Trigger a real scan:**
   - Go to `https://stage.geckoadvisor.com`
   - Submit a URL scan (with Turnstile if implemented)

2. **Monitor the scan lifecycle:**
   - Watch backend logs for scan job creation
   - Watch worker logs for scan execution
   - Verify report is archived to object storage
   - Verify report is retrievable via API/frontend

3. **Check Grafana metrics (if accessible):**
   - Navigate to `http://65.108.148.246:3001` (or via tunnel)
   - Login with `admin` / `{GRAFANA_ADMIN_PASSWORD}`
   - Import Node Exporter dashboard (ID: 1860)
   - Verify metrics are being collected

---

## 🎯 Validation Checklist

Once all steps are complete, verify:

- [ ] **Cloudflare:**
  - [ ] SSL/TLS is "Full (strict)" and HTTPS is forced
  - [ ] DNS records are proxied (orange cloud)
  - [ ] WAF Managed Ruleset is enabled
  - [ ] Bot Fight Mode is enabled
  - [ ] Edge rate limiting rule is active
  - [ ] Turnstile widget is created and keys are saved

- [ ] **Hetzner Object Storage:**
  - [ ] Bucket `gekoshare-stage` exists
  - [ ] Access keys are generated and saved securely
  - [ ] Lifecycle rule deletes `reports/*` after 30 days
  - [ ] Test file can be uploaded and retrieved

- [ ] **Environment Variables:**
  - [ ] `TURNSTILE_ENABLED=true` and keys are set
  - [ ] `OBJECT_STORAGE_ENABLED=true` and credentials are set
  - [ ] Backend and worker services restarted after env changes
  - [ ] Logs confirm services initialized successfully

- [ ] **UptimeRobot:**
  - [ ] 3 monitors are created (frontend, backend, worker)
  - [ ] All monitors show "Up" status
  - [ ] Alert contacts are configured
  - [ ] Test alert was received successfully

- [ ] **Integration Tests:**
  - [ ] Scan completes successfully end-to-end
  - [ ] Report is archived to object storage
  - [ ] Report can be retrieved from storage
  - [ ] Turnstile validation works (if frontend integrated)
  - [ ] Rate limiting triggers at expected thresholds
  - [ ] Grafana shows metrics (CPU, memory, queue depth)

---

## 🐛 Troubleshooting

### Issue: "Object storage upload failed"

**Possible causes:**
- Incorrect credentials (Access Key / Secret Key)
- Wrong endpoint URL
- Bucket name mismatch
- Network/firewall blocking S3 traffic

**Debug steps:**
1. Check backend logs for exact error message
2. Verify credentials in Hetzner console
3. Test S3 connection manually:
   ```bash
   aws s3 ls s3://gekoshare-stage \
     --endpoint-url=https://fsn1.your-objectstorage.com \
     --region=eu-central
   ```

### Issue: "Turnstile verification failed"

**Possible causes:**
- Wrong secret key
- Site key doesn't match domain
- Test token used in production mode

**Debug steps:**
1. Check backend logs for Turnstile error codes
2. Verify secret key matches Cloudflare dashboard
3. Ensure Turnstile widget domain matches request domain
4. Enable test mode in Cloudflare for debugging

### Issue: "Rate limit not triggering"

**Possible causes:**
- Requests coming from different IPs (load balancer)
- Redis connection issue
- Rate limit middleware not applied to route

**Debug steps:**
1. Check if Redis is accessible: `redis-cli ping`
2. Verify middleware is applied in route file
3. Check rate limit logs: `docker logs backend | grep rate`

### Issue: "UptimeRobot showing 'Down'"

**Possible causes:**
- Health endpoint returning non-200 status
- Cloudflare blocking UptimeRobot IPs
- Service actually down

**Debug steps:**
1. Test health endpoint manually: `curl https://stage.geckoadvisor.com/healthz`
2. Check Cloudflare firewall events for blocks
3. Whitelist UptimeRobot IPs in Cloudflare if needed

---

## 📝 Next Steps After Setup

Once all validation checks pass:

1. **Document credentials:**
   - Store all keys in a secure password manager (1Password, Bitwarden, etc.)
   - Never commit credentials to git

2. **Monitor for 24 hours:**
   - Watch UptimeRobot for any downtime alerts
   - Monitor Grafana for resource usage patterns
   - Check object storage bucket size

3. **Prepare for production:**
   - Repeat this process for production environment
   - Use production-grade secrets (longer, more random)
   - Consider using Cloudflare Turnstile "Invisible" mode for prod

4. **Plan Phase 2:**
   - Review usage data after 1 week
   - Evaluate need for Plausible analytics
   - Consider IP-Intel API if bot traffic is high

---

**Estimated Total Time:** 1.5 - 2 hours
**Priority:** Complete Steps 1-4 before announcing staging to public

**Questions or issues?** Check the troubleshooting section or backend logs for detailed error messages.
