# Privacy Advisor (MVP)

Opinionated, fast, privacy-respecting site scanner that outputs a deterministic privacy score and explainable evidence. Built as a monorepo (React/Vite + Node/Express + Prisma + BullMQ) and Dockerized for Coolify v4.

## Getting Started

- Prereqs: Node 22+, pnpm 9, Docker Desktop
- Copy `.env.example` to `.env` and adjust as needed

### Make targets

- `make dev` — compose up backend/worker/db/redis + apply Prisma migrations + seed
- `make test` — run workspace tests (unit/integration/e2e smoke)
- `make up` — build and run prod images
- `make seed` — seed DB (idempotent)

Frontend at `http://localhost:8080` (Nginx) or Vite dev at `http://localhost:5173` if running separately.

### Monorepo Layout

See `privacy-advisor/` structure in the PRD. Key dirs:
- `apps/frontend` — Vite React TypeScript + Tailwind
- `apps/backend` — Express TypeScript API, Zod validation, RFC7807 errors
- `apps/worker` — BullMQ worker, scanner, scoring engine
- `packages/shared` — Zod schemas, types, utils (PSL helpers)
- `infra/prisma` — Prisma schema and seed
- `infra/docker` — Dockerfiles, compose, Nginx config
- `tests/` — fixtures and e2e

## API

OpenAPI: `infra/openapi.yaml`

- `POST /api/scan/url` → `{ scanId, reportSlug }`
- `GET /api/scan/:id/status` → `{ status, score?, label? }`
- `GET /api/report/:slug` → `{ scan, evidence[] }`
- `POST /api/scan/app` — stub
- `POST /api/scan/address` — stub
- `POST /api/admin/refresh-lists` — requires header `X-Admin-Key`

## Scoring

Deterministic deductions from 100 with caps per category. See `apps/worker/src/scoring.ts` for implementation.

## Dev Notes

- Lists come from fixtures (`packages/shared/data/*`). Admin refresh seeds them to DB.
- Worker uses Node fetch and Cheerio. For `.test` domains with `USE_FIXTURES=1`, it loads HTML fixtures from `tests/fixtures` to stay offline/deterministic.
- Security: Helmet, CORS allowlist, rate-limits on `/api/scan/*`, admin key required on refresh.

## Coolify v4

- Build containers from `infra/docker` Dockerfiles
- Compose in `infra/docker/docker-compose.yml`
- Exposes frontend on `8080`, API on `5000`

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs lint, typecheck, test, build, and Prisma steps (generate, migrate deploy, and a migration diff check) on Node 22 with Postgres/Redis services.

## Migrations

- Develop: edit `infra/prisma/schema.prisma` then run `npx prisma migrate dev --name <change> --schema=infra/prisma/schema.prisma`
- Deploy: CI/compose runs `prisma migrate deploy` to apply versioned migration files under `infra/prisma/migrations`.

## Screenshots / GIF

- Placeholder: `docs/demo.gif`

## Attributions

- EasyPrivacy (server-side; attribution)
- WhoTracks.me (CC BY 4.0; attribution)
- Public Suffix List

## Scanning Policy (MVP)

- We only scan URLs explicitly submitted by the user.  
- Shallow crawl: ≤ 10 pages or ≤ 10s total.  
- Rate-limited background jobs.  
- For takedown/concerns, contact: contact@example.com.
