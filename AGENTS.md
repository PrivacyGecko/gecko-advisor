# AGENTS.md - Privacy Advisor

This file captures context, decisions, and runbooks for this repository. Its scope is the entire repo. Treat items here as conventions and guardrails when extending or modifying the codebase.

## Purpose

- MVP web app that scans a URL and produces a privacy score with explainable evidence and practical remediation tips.
- Tech: React/Vite/TS + Express/TS + Prisma (Postgres) + BullMQ (Redis). Dockerized for Coolify.

## Repo Layout

- `apps/frontend` - React + Vite + Tailwind. Routes: `/`, `/scan/:id`, `/r/:slug`, `/compare`, `/docs`.
- `apps/backend` - Express API (Zod validation, RFC7807 errors, Helmet, CORS, rate-limit). Serves `infra/openapi.yaml`.
- `apps/worker` - BullMQ worker, crawler/scanner (fetch + Cheerio), scoring engine.
- `packages/shared` - Zod schemas, types, utils (`normalizeUrl`, naive `etldPlusOne`). Demo list data.
- `infra/prisma` - Prisma schema + migrations + seed script.
- `infra/docker` - Dockerfiles, compose files, Nginx configs and entrypoint.
- `tests` - Fixtures + E2E skeleton (Playwright smoke).
- `AGENTS.md` - You are here.

## Services & Ports (local dev overrides)

- Backend API: `:5000` (`/api/health`)
- Frontend (Nginx): `:8080` (and optional `nginx` service on `:80`)
- DB: Postgres `:5432`
- Redis: `:6379`
- Worker health: internal `:5050/health`

## Running Locally

- Docker (recommended):
  - Dev: `docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.dev.yml up -d --build`
  - Stage profile: add `-f infra/docker/docker-compose.stage.yml` and set `APP_ENV=stage`
  - Stop: `docker compose -f ... down -v`
- Makefile shortcuts:
  - `make dev` - compose up (dev overrides) + apply Prisma migrations + seed demo
  - `make stage` - compose up (dev + stage overrides) + migrations (no seed)
  - `make prod` - compose up using production defaults from the base file
  - `make down ENV=<dev|stage|production>` - tear down the selected stack
  - `make logs ENV=<...>` - follow logs for the selected stack
  - `make seed` - rerun Prisma seed script inside the running backend container

## Environment

- Root `.env.example` (copy to `.env`):
  - `DATABASE_URL=postgresql://postgres:postgres@db:5432/privacy`
  - `REDIS_URL=redis://redis:6379`
  - `ADMIN_API_KEY=changeme`
  - `BASE_URL=https://privamule.com`
  - `BACKEND_PORT=5000`
  - `USE_FIXTURES=1` (worker loads HTML fixtures for `.test` domains)
  - `NODE_ENV=development`
  - `APP_ENV=development`
  - `FRONTEND_PORT=5173`
  - `PORT=5000`
- Staging: set `APP_ENV=stage`, `BASE_URL=https://stage.privamule.com`, unique `ADMIN_API_KEY`
- Production: set `APP_ENV=production`, `BASE_URL=https://privamule.com`, hardened secrets

## Prisma & DB

- Schema: `infra/prisma/schema.prisma` (models: `Scan`, `Evidence`, `CachedList`).
- Migrations: `infra/prisma/migrations/*` (initial migration committed).
- Dev sync: `npx prisma migrate dev --name <change> --schema=infra/prisma/schema.prisma`.
- Deploy: `prisma migrate deploy` (wired in Makefile/CI).
- Note: Images use `node:22-slim` and install `openssl`; schema includes `binaryTargets = ["native", "debian-openssl-3.0.x"]` to match runtime.

## Queue/Worker

- Queue name: `scan.site` (no colons; BullMQ forbids `:` in names).
- Redis connection: set with `maxRetriesPerRequest: null` per BullMQ requirement.
- Worker shallow crawl: same-origin only, up to 10 pages or 10 seconds.
- Evidence collected: headers, cookies, trackers, third-party, policy link, mixed content, TLS grade heuristic, basic fingerprint strings.
- Scoring: deterministic deductions with caps (see `apps/worker/src/scoring.ts`).

## Lists & Fixtures

- Cached lists (EasyPrivacy, WhoTracks.me, PSL subset) are bundled as JSON under `packages/shared/data/*`.
- Admin endpoint `/api/admin/refresh-lists` seeds DB `CachedList` from bundled fixtures (no external network needed in prod/tests).
- For `.test` domains and `USE_FIXTURES=1` the worker reads HTML from `tests/fixtures/<slug>/index.html` to keep scans offline and deterministic.

## API

- OpenAPI: `infra/openapi.yaml`.
- Key endpoints:
  - `POST /api/scan/url` -> `{ scanId, reportSlug }`
  - `GET /api/scan/:id/status`
  - `GET /api/report/:slug`
  - `GET /api/reports/recent` -> recent public summaries (domain, score, evidenceCount)
  - `POST /api/admin/refresh-lists` (X-Admin-Key)
  - Frontend docs route: `/docs` (static React page, not an API)
  - Compare view stub: `/compare?left=:slug&right=:slug` (client-side only)

## Frontend UX

- Home: segmented input (URL primary) + Recent Reports. Top-right "Docs" link. Preview panel (Score 72 SAFE, Trackers 3, SSL Valid, Data Sharing Medium). Legends: No trackers added by us, Transparent scoring, Plain-language results.
- Scan: polls `/status`; auto-redirects to `/r/:slug` when done. Progress dial with percent and trust legends (Secure connection, Transparent scan, No data stored). Top-right "Docs" link.
- Report: score dial with legend (Safe >=80, Risky 50-79, Dangerous <50); four tiles (Trackers Found, SSL/HTTPS, Data Sharing, Wallet Risk); collapsible evidence with severity chips; remediation tips; summary chips (hi/med/low); severity filter via `?sev=` and keys 1-4; Copy/Share/Export JSON; info popovers on tiles; header "Docs" link.

### Data Sharing Heuristic (MVP)
- Signals: unique tracker domains (x2), unique third-party request domains (x1), cookie issues (x1).
- Thresholds: None=0, Low <=3, Medium <=8, High >8.
- Implemented client-side in `apps/frontend/src/pages/Report.tsx` (constants easy to tune). Move server-side later for transparency.

### SSL/HTTPS Tile
- Invalid if mixed content detected; Weak if TLS grade C/D/F; Valid otherwise. Popover links to docs.

### Wallet Risk Visibility
- Tile hidden for website scans; shown (currently "None") only when `scan.targetType === 'address'` (phase 1.5 crypto).

### Docs & Compare
- `/docs` explains scoring bands, trackers, SSL/HTTPS, and the Data Sharing heuristic.
- `/compare` shows side-by-side reports using `left`/`right` slug params. Report footer links to `/compare?left=:slug`.

## Nginx & CSP

- Frontend Dockerfile uses a template + entrypoint to render `nginx.conf` from env.
- Env var `CSP` can override the default CSP; by default a strict self-only policy is applied.
- Important: header values with spaces must be quoted (already fixed in `nginx.tmpl.conf`).

## CI

- Workflow: `.github/workflows/ci.yml`
  - Node 22 + Postgres/Redis services
  - Prisma generate + migrate deploy
  - Lint, typecheck, test, build
  - `prisma migrate diff` drift check
  - DB-backed backend test enabled with `RUN_DB_TESTS=1`

## Known Gotchas & Fixes

- Prisma engines on Alpine can fail (OpenSSL mismatch). We use `node:22-slim` and install `openssl` instead.
- BullMQ: queue names cannot include `:`, Redis needs `maxRetriesPerRequest: null`.
- Nginx CSP/Permissions-Policy headers require quoting; otherwise the frontend container restarts.
- TypeScript path mapping: shared package is imported as `@privacy-advisor/shared` and mapped in `tsconfig.base.json`.
- Data Sharing is computed on the client for MVP; backfill on backend later.

## Sprint Log (Proposed 5-Sprint Plan)

1. Monorepo, Prisma, Docker/Compose, CI - completed
2. Backend API, Zod, OpenAPI, admin lists, RFC7807 - completed
3. Worker scan + scoring + fixtures/seed - completed
4. Frontend Home/Scan/Report + UX polish - completed
5. Tests (unit/integration/e2e), Nginx security, build perf - completed

## Parked Ideas

- CSV export and "Copy as Markdown" summary.
- Stronger TLS grading, CDN classification/whitelist.
- Nonce-based CSP with script/style nonces.
- More E2E tests with fixtures and score snapshots.

## Quick Commands

- Build & start dev: `docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.dev.yml up -d --build`
- Build & start stage: `APP_ENV=stage docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.dev.yml -f infra/docker/docker-compose.stage.yml up -d --build`
- Health: `GET http://localhost:5000/api/health`
- Refresh lists: `curl -H "X-Admin-Key: changeme" -X POST http://localhost:5000/api/admin/refresh-lists`
- Start scan: `curl -X POST http://localhost:5000/api/scan/url -H "content-type: application/json" -d '{"url":"https://example.com"}'`
- Recent reports: `GET http://localhost:5000/api/reports/recent`

