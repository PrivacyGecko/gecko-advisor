# Phase 1 Operations Checklist

This runbook covers the infrastructure tasks that must be completed alongside the Phase 1 code changes.

## 1. Cloudflare (Week 1)
- [ ] Move `geckoadvisor.com` DNS to Cloudflare.
- [ ] Enable **SSL/TLS** → Full (strict) and force HTTPS.
- [ ] Turn on the **CDN** for `frontend`, `api`, and `worker` subdomains.
- [ ] Enable the **WAF** managed ruleset plus Bot Fight Mode.
- [ ] Create a Turnstile widget and place the secret in `TURNSTILE_SECRET_KEY` for `/api/v2/scan`.
- [ ] Enable rate limiting rule (10 req/min/IP) at the edge as an extra guard.

## 2. UptimeRobot Pro (Week 1)
Create three monitors (1 or 3 minute interval):

| Name | Type | URL / Host | Alert Contacts |
|------|------|------------|----------------|
| GeckoAdvisor Frontend | HTTPS | `https://geckoadvisor.com/healthz` | Pager / Email |
| GeckoAdvisor API | HTTPS | `https://api.geckoadvisor.com/api/health` | Pager / Email |
| Worker Health | HTTPS | `https://worker.geckoadvisor.com/health` | Pager / Email |

Set escalation rules → alert if > 2 failures. Route to Telegram + email.

## 3. Hetzner Object Storage (Week 1–2)
1. Create an object storage project and bucket, e.g. `geckoadvisor-archive`.
2. Generate access & secret keys (read/write).
3. Add a **lifecycle rule**: delete all objects under `reports/` after 30 days.
4. Optional: enable CDN or static endpoint for read access.
5. Set the following environment variables (backend + worker):

```
OBJECT_STORAGE_ENABLED=true
OBJECT_STORAGE_ENDPOINT=https://{project}.s3.eu-central-1.hetzner.com
OBJECT_STORAGE_REGION=eu-central-1
OBJECT_STORAGE_BUCKET=geckoadvisor-archive
OBJECT_STORAGE_ACCESS_KEY=UW6A793704R90SHRR5GZ
OBJECT_STORAGE_SECRET_KEY=eAhGRPdQamoZn2DRFzizzDnr06VtXT9MJNvNaOsW
OBJECT_STORAGE_REPORT_PREFIX=reports/
OBJECT_STORAGE_PUBLIC_URL=https://{cdn-domain}
OBJECT_STORAGE_FORCE_PATH_STYLE=true
OBJECT_STORAGE_SIGNED_URL_SECONDS=3600
```

> ℹ️ Use the exact endpoint and (optional) CDN URL provided in the Hetzner console for your bucket.

## 4. Monitoring Stack (Local / Stage)
A Prometheus + Grafana stack is now bundled in `docker-compose`. To run locally:

```bash
cd infra/docker
export GRAFANA_ADMIN_PASSWORD=changeme
pnpm docker:up
```

Services exposed:

| Service | Port | Notes |
|---------|------|-------|
| Grafana | `3001` | Login `admin` / `${GRAFANA_ADMIN_PASSWORD}` |
| Prometheus | `9090` | Scrapes backend metrics + cAdvisor |
| cAdvisor | `8085` | Container CPU/memory metrics |

Import Grafana dashboards:
- `1860` (Node Exporter Full) → rename for backend metrics.
- `893` (cAdvisor) → container view.

Add Prometheus datasource: `http://prometheus:9090`.

## 5. Monthly Review Ritual
- [ ] First business day: review Grafana cost dashboard & queue depth.
- [ ] Check UptimeRobot history for outages.
- [ ] Inspect Hetzner bucket usage → ensure <30 day data only.
- [ ] Validate Cloudflare security events and adjust WAF rules if needed.

Keep this checklist updated as Phase 1 evolves.
