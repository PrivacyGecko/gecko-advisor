# E2E Testing Quick Start Guide

## TL;DR - Run E2E Tests Locally

```bash
# One-command test run (recommended)
pnpm test:e2e:local

# Or with options
pnpm test:e2e:local --browser firefox --suite performance-validation
```

That's it! The script handles everything: Docker services, database, Nginx, application startup, and cleanup.

## What Just Happened?

The script automatically:
1. Started PostgreSQL and Redis in Docker
2. Set up test database with migrations and seed data
3. Started your backend (port 5000) and frontend (port 5173)
4. Started Nginx reverse proxy (port 8080) to route requests
5. Ran Playwright tests against http://localhost:8080
6. Cleaned up all services when done

## Common Use Cases

### Run specific browser
```bash
pnpm test:e2e:local --browser chromium  # Default
pnpm test:e2e:local --browser firefox
pnpm test:e2e:local --browser webkit
```

### Run specific test suite
```bash
pnpm test:e2e:local --suite core-scanning-journey
pnpm test:e2e:local --suite performance-validation
pnpm test:e2e:local --suite accessibility-mobile
pnpm test:e2e:local --suite security-error-handling
pnpm test:e2e:local --suite license-compliance
```

### See the browser (headed mode)
```bash
pnpm test:e2e:local --headless false
```

### Combine options
```bash
pnpm test:e2e:local --browser firefox --suite core-scanning-journey --headless false
```

## Manual Testing (If Script Doesn't Work)

### Check Service Status
```bash
# Backend
curl http://localhost:5000/api/health

# Frontend
curl http://localhost:5173

# Nginx (proxy)
curl http://localhost:8080/health
curl http://localhost:8080/api/health
```

### View Logs
```bash
# Application logs
tail -f app.log

# Nginx logs
docker logs -f nginx-e2e

# PostgreSQL logs
docker logs privacy-advisor-test-db

# Redis logs
docker logs privacy-advisor-test-redis
```

### Clean Up Manually
```bash
# Stop application
pkill -f "pnpm dev"

# Stop Nginx
docker stop nginx-e2e && docker rm nginx-e2e

# Stop databases
cd tests/e2e
docker-compose -f docker-compose.test.yml down
```

## Troubleshooting

### "Port already in use"
```bash
# Find and kill process using the port
lsof -ti:8080 | xargs kill -9  # Nginx
lsof -ti:5173 | xargs kill -9  # Frontend
lsof -ti:5000 | xargs kill -9  # Backend
```

### "Cannot connect to Docker daemon"
```bash
# Make sure Docker Desktop is running
open -a Docker

# Or check Docker status
docker ps
```

### "Database connection failed"
```bash
# Restart PostgreSQL
docker restart privacy-advisor-test-db

# Check if it's healthy
docker exec privacy-advisor-test-db pg_isready -U postgres
```

### Tests timing out
```bash
# Check if all services are running
curl http://localhost:8080/health  # Should return "healthy"

# If Nginx isn't responding, check its logs
docker logs nginx-e2e
```

## Project Structure

```
tests/e2e/
├── nginx.conf                    # Nginx reverse proxy config
├── docker-compose.test.yml       # Local test infrastructure
├── playwright.config.ts          # Playwright configuration (baseURL: 8080)
├── global-setup.ts              # Wait for services before tests
├── scripts/
│   └── run-local-e2e.sh         # Automated test runner
├── tests/                        # Test files
├── QUICKSTART.md                # This file
├── NGINX_SETUP.md               # Detailed documentation
└── CHANGES_SUMMARY.md           # What changed and why
```

## How It Works

```
┌─────────────────┐
│ Playwright Tests│
│  (port 8080)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Nginx       │  ◄─── Reverse proxy
│  (port 8080)    │
└───┬─────────┬───┘
    │         │
    │         └──────────┐
    ▼                    ▼
┌─────────┐         ┌─────────┐
│ Backend │         │Frontend │
│  :5000  │         │  :5173  │
└─────────┘         └─────────┘
```

**Why Nginx?**
- Single entry point for tests (port 8080)
- Routes `/api/*` to backend, everything else to frontend
- Matches production architecture
- Provides health check endpoint
- Better test reliability

## CI/CD

The same setup runs in GitHub Actions:
- `.github/workflows/e2e-tests.yml` uses identical Nginx configuration
- Tests run in matrix: 3 browsers × 5 test suites = 15 combinations
- All tests target http://localhost:8080

## Need More Details?

- **Setup documentation**: `tests/e2e/NGINX_SETUP.md`
- **What changed**: `tests/e2e/CHANGES_SUMMARY.md`
- **Playwright docs**: https://playwright.dev/docs/intro
- **Nginx docs**: https://nginx.org/en/docs/

## Quick Commands Cheat Sheet

```bash
# Run all tests locally with full setup
pnpm test:e2e:local

# Run specific browser + suite in headed mode
pnpm test:e2e:local --browser firefox --suite core-scanning-journey --headless false

# Check service health
curl http://localhost:8080/health

# View application logs
tail -f app.log

# View Nginx logs
docker logs nginx-e2e

# Clean up everything
docker stop nginx-e2e && docker rm nginx-e2e
docker-compose -f tests/e2e/docker-compose.test.yml down
pkill -f "pnpm dev"

# Test Nginx config syntax
docker run --rm -v $(pwd)/tests/e2e/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t
```

## Getting Help

1. Check logs first (app.log, docker logs)
2. Verify services are running (curl health endpoints)
3. Review NGINX_SETUP.md for detailed troubleshooting
4. Check GitHub Actions logs for CI-specific issues
