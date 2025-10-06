# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Privacy Advisor is an opinionated, fast, privacy-respecting site scanner that outputs a deterministic privacy score with explainable evidence. Built as a monorepo with React/Vite frontend, Node/Express backend, BullMQ worker, and Prisma ORM with PostgreSQL.

## Development Commands

### Package Manager
- Uses `pnpm` with workspaces
- Package manager is pinned to `pnpm@10.14.0`

### Common Commands
```bash
# Development
pnpm dev                    # Start all services in development mode
make dev                    # Docker: start dev stack + migrate + seed
make stage                  # Docker: start stage stack + migrate
make prod                   # Docker: start production stack

# Building & Testing
pnpm build                  # Build all packages
pnpm lint                   # Lint all packages
pnpm typecheck              # Type check all packages
pnpm test                   # Run all tests

# Database
pnpm prisma:generate        # Generate Prisma client
pnpm prisma:migrate         # Deploy migrations
pnpm seed                   # Seed database with demo data

# Docker Management
make up ENV=dev             # Start containers only
make down ENV=dev           # Stop and remove containers
make logs ENV=dev           # Follow logs
```

### Individual Package Commands
```bash
# Backend (apps/backend)
cd apps/backend
pnpm dev                    # Start with tsx
pnpm build                  # TypeScript build
pnpm test                   # Run vitest tests
pnpm generate:openapi       # Generate OpenAPI spec

# Frontend (apps/frontend)
cd apps/frontend
pnpm dev                    # Start Vite dev server
pnpm build                  # Build for production
pnpm preview                # Preview production build

# Worker (apps/worker)
cd apps/worker
pnpm dev                    # Start worker with tsx
pnpm build                  # TypeScript build
pnpm test                   # Run vitest tests
```

## Architecture

### Monorepo Structure
- **apps/frontend**: React + Vite + TypeScript + Tailwind CSS
- **apps/backend**: Express API with Zod validation, RFC7807 errors, security middleware
- **apps/worker**: BullMQ worker for scanning and scoring
- **packages/shared**: Shared Zod schemas, types, and utilities
- **infra/prisma**: Database schema, migrations, and seed scripts
- **infra/docker**: Docker configurations for all environments

### Key Technologies
- **Frontend**: React 18, Vite, TanStack Query, React Router, Tailwind CSS
- **Backend**: Express, Zod validation, Prisma ORM, BullMQ
- **Worker**: BullMQ, Cheerio for HTML parsing, custom scoring engine
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: Redis with BullMQ
- **Deployment**: Docker + Docker Compose, designed for Coolify v4

### Database Models
- **Scan**: Main entity for scan requests and results
- **Evidence**: Privacy issues found during scanning
- **Issue**: Categorized privacy violations
- **CachedList**: Cached privacy/tracker lists (EasyPrivacy, WhoTracks.me)

### API Endpoints
- `POST /api/scan/url` - Submit URL for scanning
- `GET /api/scan/:id/status` - Check scan progress
- `GET /api/report/:slug` - Get scan report
- `GET /api/reports/recent` - Recent public reports
- `POST /api/admin/refresh-lists` - Refresh privacy lists (requires admin key)

## Development Workflow

### Environment Setup
1. Copy `.env.example` to `.env`
2. Set `APP_ENV` (development/stage/production)
3. Configure database and Redis URLs
4. Set `ADMIN_API_KEY` for admin endpoints

### Running Locally
**Recommended**: Use Docker with `make dev`
- Starts all services with development overrides
- Applies Prisma migrations automatically
- Seeds database with demo data
- Frontend available at `http://localhost:8080`
- API available at `http://localhost:5000`

**Alternative**: Run services individually with `pnpm dev`

### Database Migrations
- Edit schema: `infra/prisma/schema.prisma`
- Create migration: `npx prisma migrate dev --name <change> --schema=infra/prisma/schema.prisma`
- Deploy migrations: `pnpm prisma:migrate` or `make migrate`

## Code Conventions

### TypeScript
- Strict TypeScript configuration
- Consistent type imports enforced via ESLint
- Unused variables with `_` prefix are allowed

### Imports
- Use `@privacy-advisor/shared` for shared package imports
- Path mapping configured in `tsconfig.base.json`
- Prefer consistent type imports: `import type { Type } from 'module'`

### Testing
- **Backend/Worker**: Vitest for unit and integration tests
- **Frontend**: Vitest for component tests
- Test fixtures available in `tests/fixtures/`
- Use `USE_FIXTURES=1` for deterministic testing with `.test` domains

### Linting & Formatting
- ESLint with TypeScript rules
- Prettier for code formatting
- Run `pnpm lint` and `pnpm typecheck` before committing

## Security Considerations

### Backend Security
- Helmet middleware for security headers
- CORS with allowlist configuration
- Rate limiting on scan endpoints
- Admin endpoints require `X-Admin-Key` header
- Input validation with Zod schemas

### Frontend Security
- Strict Content Security Policy (CSP)
- Environment-specific CSP configuration via `CSP` env var
- Nginx serves frontend with security headers

## Queue & Worker System

### Queue Configuration
- Queue name: `scan.site` (no colons allowed)
- Redis connection requires `maxRetriesPerRequest: null`
- Background processing for scan jobs

### Scanning Logic
- Shallow crawl: max 10 pages or 10 seconds
- Same-origin only for privacy compliance
- Collects evidence: headers, cookies, trackers, third-party requests
- Deterministic scoring with category-based deductions

## Known Limitations & Gotchas

- BullMQ queue names cannot contain `:` characters
- Prisma binary targets include `debian-openssl-3.0.x` for Docker compatibility
- Data Sharing calculation is client-side in MVP (to be moved server-side)
- Nginx CSP headers must be properly quoted to avoid container restarts
- Worker uses HTML fixtures for `.test` domains when `USE_FIXTURES=1`

## Deployment

### Environments
- **Development**: Local with dev overrides, full debugging
- **Stage**: Uses stage configuration, maps to `stage.privamule.com` domains
- **Production**: Production configuration, maps to `privamule.com` domains

### Docker Compose
- Base: `infra/docker/docker-compose.yml`
- Dev override: `infra/docker/docker-compose.dev.yml`
- Stage override: `infra/docker/docker-compose.stage.yml`
- Designed for Coolify v4 deployment platform