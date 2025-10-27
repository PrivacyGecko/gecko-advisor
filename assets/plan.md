# 🦎 GeckoAdvisor — Launch Roadmap & Implementation Plan

## 🎯 Objective
Launch GeckoAdvisor as a **public, free-tier privacy scanning tool** with a focus on:
- Stability and protection at launch
- Incremental scalability
- Controlled costs
- Privacy-first analytics and visibility

### ✅ Success Metrics (6-Month Targets)
| Metric | Target | Purpose |
|---------|---------|----------|
| **Uptime** | ≥ 99.5 % (measured via UptimeRobot) | Service reliability benchmark |
| **Average Daily Scans** | 500 + by Month 6 | Product traction indicator |
| **Abuse Threshold** | < 2 % rejected scans due to bots/VPNs | Abuse-mitigation KPI |
| **Storage Retention Accuracy** | 100 % compliance with 30-day policy | Data-governance metric |
| **Budget Adherence** | ≤ ₹ 7 000 / mo excluding server | Financial control metric |

---

## 🧭 Roadmap Overview (6 Months)

| Phase | Timeline | Focus | Key Goal |
|--------|-----------|--------|-----------|
| **Phase 1 – Launch (Month 0–1)** | Immediate | Core Stability & Protection | Launch securely, ensure uptime, prevent crashes |
| **Phase 2 – Growth (Month 2–3)** | Post-launch | Visibility & Efficiency | Track usage, optimize caching and load |
| **Phase 3 – Scale (Month 4–6)** | As traffic grows | Abuse Mitigation & Automation | Handle high load safely, prevent abuse & cost spikes |

---

## ⚙️ Phase 1 – Launch (Month 0–1)

**Goal:** Deploy GeckoAdvisor publicly with minimal risk, stable infrastructure, and basic monitoring.

### ✅ Core Implementations
| Component | Purpose | Tools / Notes |
|------------|----------|---------------|
| **Cloudflare (Free)** | DNS, SSL/TLS, CDN caching, bot protection | Enable HTTPS, cache static assets, Turnstile for `/scan` |
| **UptimeRobot Pro** | External uptime monitoring (1–3 min) | Monitor API / queue / frontend; alerts via Telegram / email |
| **Hetzner Object Storage** | Store reports, screenshots, logs (30-day TTL) | ⚠ Integration may exceed week 2 — migrating persistence + retention scripts requires testing |
| **Rate Limiting (Basic)** | Prevent abuse and overload | `express-rate-limit` + Redis; 10 requests / hour / IP |
| **Monitoring (Local)** | CPU / memory / queue depth | Grafana + cAdvisor; Telegram alert for high load |

### 🧩 Deliverables
- ☐ Public site with active scan feature  
- ☐ SSL & edge protection (Cloudflare)  
- ☐ Auto-alerts for downtime  
- ☐ Logs stored in Object Storage  

### 💰 Expected Monthly Cost
**₹ 2 000 – ₹ 3 500 ($25–40)**  
(Cloudflare Free + UptimeRobot Pro + Object Storage)

---

## 📈 Phase 2 – Growth (Month 2–3)

**Goal:** Add user visibility, optimize infra usage, and improve caching.

### 🔧 Enhancements
| Component | Purpose | Tools / Notes |
|------------|----------|---------------|
| **Plausible (Managed)** | Privacy-friendly analytics to measure usage | ⚠ Add DPA + update Privacy Policy before activation to ensure GDPR compliance |
| **Improved Caching** | Reduce repeated scans and bandwidth | Cloudflare edge + Redis; cache 24 h |
| **Job Queue Optimization** | Smooth out load spikes | Limit concurrency = CPU – 2; backpressure “try later” |
| **Storage Pruning** | Save costs | Delete expired reports via lifecycle rules (verify 30-day window meets legal / ops needs) |
| **CI/CD Refinement** | Prevent test overuse | Smoke per push; nightly E2E; 7-day artifact retention |

### 🧩 Deliverables
- ☐ Analytics dashboard live  
- ☐ Cached scan results  
- ☐ Lower CPU peaks during spikes  
- ☐ Reduced storage cost (~30 %)  

### 💰 Expected Monthly Cost
**₹ 3 500 – ₹ 4 500 ($40–55)**

---

## 🕵️ Phase 3 – Scale (Month 4–6)

**Goal:** Handle higher scan volume and stop abuse or spam traffic before it impacts stability.

### 🔐 Advanced Controls
| Component | Purpose | Tools / Notes |
|------------|----------|---------------|
| **IP-Intel API (Small Plan)** | Block known bad IPs / VPNs / DC ranges | Clarify expected call volume (~20 K lookups / mo) so ₹ 800 – ₹ 2 500 estimate stays valid |
| **Progressive Profiling** | Require verified emails for higher quotas | 3 scans/day anon; 10 / h verified |
| **Queue Prioritization** | Trusted vs anonymous queues | BullMQ priority queues |
| **Alert Thresholds** | Auto monitoring | Grafana + Prometheus alerts |
| **Transparency Report** | Publish scan volume + uptime | Brand trust |

### 🧩 Deliverables
- ☐ Intelligent rate limiting per IP + user  
- ☐ Auto-blocking of suspicious traffic  
- ☐ Stable queue performance under load  
- ☐ Public transparency report  

### 💰 Expected Monthly Cost
**₹ 5 000 – ₹ 7 000 ($60–85)**  

---

## 🧮 6-Month Budget Envelope (Including Compute)

| Item | Monthly ₹ | 6-Month ₹ | Notes |
|------|------------|-----------|-------|
| **CCX21 Server** | 3 500 – 4 000 | 21 000 – 24 000 | Base compute (fixed) |
| **Cloudflare (Free → Pro)** | 0 – 2 000 | 0 – 12 000 | CDN + WAF |
| **UptimeRobot Pro** | 600 – 900 | 3 600 – 5 400 | Monitoring |
| **Hetzner Object Storage** | 1 500 – 2 500 | 9 000 – 15 000 | Reports / logs |
| **Plausible (Managed)** | 800 – 1 000 | 4 800 – 6 000 | Analytics |
| **IP-Intel API** | 800 – 2 500 | 4 800 – 15 000 | Abuse control |
| **→ Total (6 mo)** | **≈ ₹ 43 K – ₹ 77 K** | Includes compute for full transparency |

---

## 🧠 Incremental Launch Philosophy

> **Start small, scale with evidence.**
>
> 1. Launch stable core (Cloudflare + UptimeRobot + Object Storage).  
> 2. Observe real traffic for 4–6 weeks.  
> 3. Add analytics once baseline users exist.  
> 4. Layer IP-intel & queue controls only after proven load.  
> 5. Review metrics & cost monthly.

---

## ✅ Summary Roadmap

| Phase | Focus | Key Components | Monthly Cost (₹) |
|--------|--------|----------------|------------------|
| **Phase 1** | Launch Stability | Cloudflare • UptimeRobot • Hetzner OS | 2 K–3.5 K |
| **Phase 2** | Growth & Insights | + Plausible | 3.5 K–4.5 K |
| **Phase 3** | Scale & Protection | + IP-Intel API | 5 K–7 K |

---

## 📋 Next Steps
- [ ] Enable **Cloudflare & UptimeRobot Pro** for baseline protection.  
- [ ] Activate **Hetzner Object Storage** with 30-day TTL policy.  
- [ ] Deploy beta and monitor queue load, memory, uptime.  
- [ ] Integrate **Plausible (Managed)** once user traffic starts.  
- [ ] Add **IP-Intel API** after consistent load / abuse signals.  
- [ ] Review budget & metrics monthly → optimize cache TTL + rate limits.  

---

**Document Version:** v1.1 (updated October 2025)  
**Maintainer:** Privacy Gecko / GeckoAdvisor Team
