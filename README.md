# Privacy Advisor (MVP)

Opinionated, fast, privacy-respecting site scanner that outputs a deterministic privacy score and explainable evidence. Built as a monorepo (React/Vite + Node/Express + Prisma + BullMQ) and Dockerized for Coolify v4.

## Getting Started

- Prereqs: Node 22+, pnpm 9, Docker Desktop
- Copy `.env.example` to `.env` and set `APP_ENV` (`development`, `stage`, or `production`) plus credentials before building

### Make targets

- `make dev` - bring up the local stack (dev overrides), apply Prisma migrations, and seed demo fixtures
- `make stage` - run the stack locally with stage configuration and apply migrations (no seed)
- `make prod` - build and run the production stack locally using the base compose file
- `make up ENV=<dev|stage|production>` - custom entry point if you only need containers
- `make down ENV=<dev|stage|production>` - stop and remove containers/volumes for the selected environment (defaults to `dev`)
- `make logs ENV=<dev|stage|production>` - tail logs for the selected environment
- `make test` - run workspace tests (unit/integration/e2e smoke)
- `make seed` - reseed the running backend container (uses Prisma seed script)

Frontend is reachable at `http://localhost:8080` when the dev stack is running (served by Nginx). Vite dev server lives at `http://localhost:5173` if you run it separately.

### Environments

- **Development (local):** Base compose + `docker-compose.dev.yml` override. Exposes Postgres, Redis, API, and frontend on localhost for rapid iteration.
- **Stage:** Use the base file together with `infra/docker/docker-compose.stage.yml`. Set `APP_ENV=stage`, `BASE_URL=https://stage.privamule.com`, and provide a stage `ADMIN_API_KEY` in Coolify or your secrets manager.
- **Production:** Use the base file together with `infra/docker/docker-compose.prod.yml`. Ensure `APP_ENV=production`, `BASE_URL=https://privamule.com`, a production `ADMIN_API_KEY`, and persistent volumes.

### Monorepo Layout

See `privacy-advisor/` structure in the PRD. Key dirs:
- `apps/frontend` - Vite React TypeScript + Tailwind
- `apps/backend` - Express TypeScript API, Zod validation, RFC7807 errors
- `apps/worker` - BullMQ worker, scanner, scoring engine
- `packages/shared` - Zod schemas, types, utils (PSL helpers)
- `infra/prisma` - Prisma schema and seed
- `infra/docker` - Dockerfiles, compose, Nginx config
- `tests/` - fixtures and e2e

## API

OpenAPI: `infra/openapi.yaml`

- `POST /api/scan/url` -> `{ scanId, reportSlug }`
- `GET /api/scan/:id/status` -> `{ status, score?, label? }`
- `GET /api/report/:slug` -> `{ scan, evidence[] }`
- `POST /api/scan/app` - stub
- `POST /api/scan/address` - stub
- `POST /api/admin/refresh-lists` - requires header `X-Admin-Key`

## Scoring

Deterministic deductions from 100 with caps per category. See `apps/worker/src/scoring.ts` for implementation.

## Dev Notes

- Lists come from fixtures (`packages/shared/data/*`). Admin refresh seeds them to DB.
- Worker uses Node fetch and Cheerio. For `.test` domains with `USE_FIXTURES=1`, it loads HTML fixtures from `tests/fixtures` to stay offline/deterministic.
- Security: Helmet, CORS allowlist, rate-limits on `/api/scan/*`, admin key required on refresh.

## Coolify v4

- Stage/production deployments use `infra/docker/docker-compose.yml` as the base file
- Add `infra/docker/docker-compose.stage.yml` when creating a stage stack (Coolify > Docker Compose > Additional Compose files)
- Provide environment variables (`APP_ENV`, `BASE_URL`, `DATABASE_URL`, `REDIS_URL`, `ADMIN_API_KEY`, `CSP`) via Coolify secrets
- Persistent volumes are declared for Postgres and Redis (`privacy-postgres`, `privacy-redis`) and will be created automatically

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
- Shallow crawl: 10 pages or 10s total.
- Rate-limited background jobs.
- For takedown/concerns, contact: contact@example.com.


