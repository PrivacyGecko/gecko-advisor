# Immediate Setup Tasks - Quick Checklist
**Updated:** October 26, 2025

## ✅ What You've Completed
- ✅ Domain migrated to Cloudflare
- ✅ UptimeRobot monitors created
- ✅ Hetzner Object Storage bucket created (`gekoshare-stage`)

## 🔧 What's Left (In Priority Order)

### **Task 1: Get Hetzner Object Storage Credentials** (~5 min)

1. Go to Hetzner Cloud Console → Object Storage → Keys
2. Click "Generate new key"
   - Name: `geckoadvisor-stage-backend`
   - Permissions: **Read & Write**
   - Bucket scope: `gekoshare-stage`
3. **IMMEDIATELY SAVE THESE VALUES:**
   ```
   Access Key ID: _________________
   Secret Access Key: _________________
   Endpoint URL: _________________ (usually https://fsn1.your-objectstorage.com)
   Region: _________________ (usually eu-central or fsn1)
   ```
4. ⚠️ **Store in password manager** - you can't see the secret key again!

---

### **Task 2: Configure Cloudflare** (~15 min)

Go to Cloudflare Dashboard for `geckoadvisor.com`:

#### SSL/TLS (5 min)
1. SSL/TLS → Overview → Set to **"Full (strict)"**
2. SSL/TLS → Edge Certificates → Enable **"Always Use HTTPS"**
3. SSL/TLS → Edge Certificates → Enable **"Automatic HTTPS Rewrites"**

#### Caching (3 min)
1. Caching → Configuration → Set to **"Standard"**
2. Caching → Cache Rules → Create rule:
   - Name: `Cache Static Assets`
   - Match: `File extension is in: jpg, jpeg, png, gif, svg, ico, css, js, woff, woff2, ttf`
   - Cache: Eligible, Edge TTL: 1 day, Browser TTL: 4 hours

#### Security/WAF (7 min)
1. Security → WAF → Deploy **"Cloudflare Managed Ruleset"**
2. Security → Bots → Enable **"Bot Fight Mode"**
3. Security → WAF → Rate limiting → Create rule:
   - Name: `Scan Endpoint Protection`
   - Match: `URI Path contains /api/v2/scan`
   - Characteristic: `IP`
   - Rate: 15 requests per 60 seconds
   - Action: Block for 60 seconds

#### DNS Verification (2 min)
Verify these records are **Proxied (🟠 orange cloud)**:
- `stage.geckoadvisor.com` → 65.108.148.246
- `*.stage.geckoadvisor.com` → stage.geckoadvisor.com
- `www.geckoadvisor.com` → 65.108.148.246
- `geckoadvisor.com` (@) → 65.108.148.246

---

### **Task 3: Create Cloudflare Turnstile Widget** (~10 min)

1. Cloudflare Dashboard → **Turnstile** (left sidebar)
2. Click **"Add site"**
3. Fill in:
   - Site name: `GeckoAdvisor Stage`
   - Domain: `stage.geckoadvisor.com`
   - Widget Mode: **"Managed"** (shows challenge when suspicious)
   - Widget appearance: **Auto** (matches site theme)
4. **SAVE THESE VALUES:**
   ```
   Site Key: _________________
   Secret Key: _________________
   ```
5. ⚠️ **Store in password manager** - you'll need both keys!

---

### **Task 4: Update Environment Variables in Coolify** (~10 min)

1. Go to Coolify dashboard → Your Privacy Advisor stage app
2. Navigate to **Environment Variables**
3. **Add/Update these variables:**

```bash
# Cloudflare Turnstile
TURNSTILE_ENABLED=true
TURNSTILE_SECRET_KEY=<from Task 3>
TURNSTILE_SITE_KEY=<from Task 3>

# Hetzner Object Storage
OBJECT_STORAGE_ENABLED=true
OBJECT_STORAGE_ENDPOINT=<from Task 1>
OBJECT_STORAGE_REGION=<from Task 1>
OBJECT_STORAGE_BUCKET=gekoshare-stage
OBJECT_STORAGE_ACCESS_KEY=<from Task 1>
OBJECT_STORAGE_SECRET_KEY=<from Task 1>
OBJECT_STORAGE_REPORT_PREFIX=reports/
OBJECT_STORAGE_PUBLIC_URL=
OBJECT_STORAGE_FORCE_PATH_STYLE=true
OBJECT_STORAGE_SIGNED_URL_SECONDS=3600
```

4. Click **"Save"**
5. **Restart services:**
   - Restart `backend` container
   - Restart `worker` container

---

### **Task 5: Verify UptimeRobot Config** (~5 min)

Check your UptimeRobot monitors are configured correctly:

**Monitor 1: Frontend**
- URL: `https://stage.geckoadvisor.com/healthz`
- Interval: 3 minutes
- Alert after: 2 failures

**Monitor 2: Backend API**
- URL: `https://api.stage.geckoadvisor.com/api/health`
- Interval: 3 minutes
- Alert after: 2 failures

**~~Monitor 3: Worker~~** ❌ **DELETE THIS MONITOR**
- Workers are internal services that don't need external monitoring
- Worker health is indirectly monitored via backend queue metrics
- If this monitor exists, delete it to avoid false DNS resolution errors

Make sure alert contacts (email/Telegram) are added to both monitors.

---

### **Task 6: Test Everything** (~15 min)

#### Test 1: Object Storage
```bash
# Trigger a test scan
curl -X POST https://api.stage.geckoadvisor.com/api/v2/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Check backend logs
# Look for: "Report archived to object storage: reports/{scanId}.json"

# Verify in Hetzner Console → Object Storage → gekoshare-stage → reports/
# Should see a new JSON file
```

#### Test 2: Turnstile (requires frontend integration)
- Visit `https://stage.geckoadvisor.com`
- Submit a scan
- Verify Turnstile challenge appears (if suspicious) or passes invisibly
- Check backend logs for "Turnstile verification succeeded"

#### Test 3: Rate Limiting
```bash
# Send 20 requests rapidly
for i in {1..20}; do
  curl -X POST https://api.stage.geckoadvisor.com/api/v2/scan \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com"}'
  echo " - Request $i"
done

# Should see 429 responses after ~10-15 requests
```

#### Test 4: UptimeRobot
- Go to UptimeRobot dashboard
- All monitors should show **"Up"** (green)
- Check "Last checked" time is recent

---

## 📋 Final Validation Checklist

Before announcing to public, verify:

- [ ] **Cloudflare**
  - [ ] SSL is "Full (strict)" and HTTPS forced
  - [ ] DNS records are proxied (🟠)
  - [ ] WAF + Bot Fight Mode enabled
  - [ ] Rate limiting rule active
  - [ ] Turnstile widget created

- [ ] **Object Storage**
  - [ ] Access keys generated and saved
  - [ ] Test report uploaded successfully
  - [ ] Reports visible in Hetzner Console

- [ ] **Environment Variables**
  - [ ] All Turnstile vars set
  - [ ] All Object Storage vars set
  - [ ] Backend and worker restarted
  - [ ] Logs show "initialized" messages

- [ ] **UptimeRobot**
  - [ ] Worker monitor deleted (if it existed)
  - [ ] 2 monitors (Frontend + Backend) showing "Up"
  - [ ] Alert contacts configured
  - [ ] Escalation rules set (alert after 2 failures)

- [ ] **End-to-End Test**
  - [ ] Can submit scan via frontend
  - [ ] Scan completes successfully
  - [ ] Report loads correctly
  - [ ] Report exists in object storage
  - [ ] Rate limiting works as expected

---

## ⏱️ Time Estimates

- Task 1 (Object Storage Credentials): **5 minutes**
- Task 2 (Cloudflare Config): **15 minutes**
- Task 3 (Turnstile Widget): **10 minutes**
- Task 4 (Environment Variables): **10 minutes**
- Task 5 (UptimeRobot Verify): **5 minutes**
- Task 6 (Testing): **15 minutes**

**Total: ~60 minutes** (1 hour of focused work)

---

## 🆘 Quick Troubleshooting

**"Object storage upload failed"**
→ Check endpoint URL, verify credentials, restart worker

**"Turnstile verification failed"**
→ Verify secret key matches, check domain matches widget config

**"Rate limit not working"**
→ Check Redis connection, verify middleware applied in routes

**"UptimeRobot showing Down"**
→ Test health endpoints manually with `curl`, check Cloudflare firewall

---

## 📝 Notes

- **Report Retention:** All reports kept indefinitely (no auto-deletion)
- **Storage Costs:** Monitor monthly, ~₹25-50/month for 1000 reports
- **Cleanup:** Can add scheduled cleanup job later if needed
- **Security:** All credentials stored in password manager, never in git

---

**Ready to launch?** Complete all tasks, run all tests, then announce! 🚀
