# E2E Testing with Nginx Reverse Proxy

## Overview

The E2E test environment uses Nginx as a reverse proxy to route requests between the frontend (Vite dev server on port 5173) and backend API (Express server on port 5000) through a single port (8080). This setup mirrors the production architecture and ensures tests run against a realistic environment.

## Architecture

```
┌─────────────────────────────────────────────┐
│          Playwright Tests                   │
│         (localhost:8080)                     │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         Nginx Reverse Proxy                 │
│           (Port 8080)                        │
│  ┌────────────────────────────────────────┐ │
│  │  /health      → Health check endpoint  │ │
│  │  /api/*       → Backend (port 5000)    │ │
│  │  /*           → Frontend (port 5173)   │ │
│  └────────────────────────────────────────┘ │
└─────────┬─────────────────────┬─────────────┘
          │                     │
          ▼                     ▼
┌───────────────────┐  ┌──────────────────┐
│  Express Backend  │  │  Vite Frontend   │
│   (Port 5000)     │  │   (Port 5173)    │
└─────────┬─────────┘  └──────────────────┘
          │
          ▼
┌───────────────────────────────────────────┐
│  PostgreSQL (5432) + Redis (6379)         │
└───────────────────────────────────────────┘
```

## Configuration Files

### 1. `tests/e2e/nginx.conf`
Main Nginx configuration that:
- Listens on port 8080
- Provides `/health` endpoint for readiness checks
- Proxies `/api/*` to backend (5000)
- Proxies all other requests to frontend (5173)
- Handles WebSocket connections for Vite HMR
- Includes appropriate timeouts and buffer settings

### 2. `tests/e2e/docker-compose.test.yml`
Docker Compose setup for local testing that includes:
- PostgreSQL database
- Redis cache/queue
- Nginx reverse proxy (optional for local use)

### 3. `.github/workflows/e2e-tests.yml`
Updated workflow that:
- Starts backend and frontend services
- Launches Nginx in Docker with host networking
- Waits for all services to be ready
- Runs tests through the Nginx proxy
- Captures logs from all services on failure

## Running Tests Locally

### Option 1: Using the Helper Script (Recommended)

```bash
# Run all tests with default browser (chromium)
./tests/e2e/scripts/run-local-e2e.sh

# Run specific browser
./tests/e2e/scripts/run-local-e2e.sh --browser firefox

# Run specific test suite
./tests/e2e/scripts/run-local-e2e.sh --suite core-scanning-journey

# Run with visible browser
./tests/e2e/scripts/run-local-e2e.sh --headless false

# Combine options
./tests/e2e/scripts/run-local-e2e.sh --browser webkit --suite performance-validation --headless false
```

### Option 2: Manual Setup

```bash
# 1. Start infrastructure services
cd tests/e2e
docker-compose -f docker-compose.test.yml up -d postgres redis

# 2. Setup environment
cd ../../
cp .env.example .env.test
# Edit .env.test with test configuration

# 3. Setup database
pnpm prisma:generate
pnpm exec prisma migrate deploy --schema=infra/prisma/schema.prisma
pnpm seed

# 4. Build and start application
pnpm build
pnpm dev &

# 5. Wait for services (in another terminal)
# Backend: curl http://localhost:5000/api/health
# Frontend: curl http://localhost:5173

# 6. Start Nginx
docker run -d \
  --name nginx-e2e \
  --network host \
  -v $(pwd)/tests/e2e/nginx.conf:/etc/nginx/nginx.conf:ro \
  nginx:alpine

# 7. Wait for Nginx
curl http://localhost:8080/health

# 8. Run tests
E2E_BASE_URL=http://localhost:8080 pnpm exec playwright test

# 9. Cleanup
docker stop nginx-e2e && docker rm nginx-e2e
docker-compose -f tests/e2e/docker-compose.test.yml down
```

## CI/CD Environment

In GitHub Actions, the workflow:

1. **Starts Services**: PostgreSQL and Redis via GitHub Actions services
2. **Prepares Database**: Runs migrations and seeds test data
3. **Builds Application**: Compiles frontend and backend
4. **Starts Application**: Runs `pnpm dev` in background
5. **Verifies Services**: Waits for backend (5000) and frontend (5173)
6. **Starts Nginx**: Launches Docker container with host networking
7. **Verifies Proxy**: Checks health endpoint and API proxy
8. **Runs Tests**: Executes Playwright tests against port 8080
9. **Collects Logs**: Captures app and Nginx logs on failure
10. **Cleanup**: Stops all services and containers

## Troubleshooting

### Tests timing out connecting to application

**Problem**: Tests fail with connection timeout errors.

**Solution**:
1. Check if all services are running:
   ```bash
   curl http://localhost:5000/api/health  # Backend
   curl http://localhost:5173             # Frontend
   curl http://localhost:8080/health      # Nginx
   ```

2. Check Nginx logs:
   ```bash
   docker logs nginx-e2e
   ```

3. Verify Nginx is proxying correctly:
   ```bash
   curl -v http://localhost:8080/api/health
   ```

### Nginx fails to start

**Problem**: Nginx container exits immediately.

**Solution**:
1. Check Nginx configuration syntax:
   ```bash
   docker run --rm -v $(pwd)/tests/e2e/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t
   ```

2. Review Nginx logs:
   ```bash
   docker logs nginx-e2e
   ```

### Backend API not accessible through proxy

**Problem**: Direct backend access works but proxy returns 502/504.

**Solution**:
1. Verify backend is listening on correct port:
   ```bash
   netstat -an | grep 5000
   ```

2. Check if Docker can reach host services:
   - On Linux: Use `--network host` (already configured)
   - On Mac/Windows: Use `host.docker.internal` in nginx.conf

3. Increase Nginx timeouts in `nginx.conf`

### Frontend shows 404 for routes

**Problem**: Root path works but routes return 404.

**Solution**:
- This is expected for Vite dev server. The `try_files $uri /index.html` directive in Nginx handles SPA routing.
- For production builds, ensure frontend is built before testing.

## Port Reference

| Service    | Port  | Access                     |
|------------|-------|----------------------------|
| Nginx      | 8080  | http://localhost:8080      |
| Backend    | 5000  | http://localhost:5000      |
| Frontend   | 5173  | http://localhost:5173      |
| PostgreSQL | 5432  | postgresql://localhost:5432|
| Redis      | 6379  | redis://localhost:6379     |

## Environment Variables

```bash
# Test environment
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/privacy_advisor_test
REDIS_URL=redis://localhost:6379
E2E_BASE_URL=http://localhost:8080  # Important: Tests use this URL

# Backend configuration
BACKEND_PORT=5000
FRONTEND_PUBLIC_URL=http://localhost:8080
BACKEND_PUBLIC_URL=http://localhost:5000
```

## Key Features

### Health Check Endpoint

Nginx provides a `/health` endpoint that returns `200 OK` when ready. This is used by:
- Global setup scripts to verify environment is ready
- CI/CD pipelines for readiness checks
- Monitoring tools

### WebSocket Support

The configuration includes WebSocket upgrade headers for:
- Vite Hot Module Replacement (HMR)
- Future real-time features

### CORS Handling

Development CORS headers are configured in Nginx to allow:
- Cross-origin requests from localhost:8080
- Credentials (cookies, auth headers)
- Common HTTP methods

### Timeouts

Configured timeouts:
- Connect: 60s
- Read: 60s
- Send: 60s

These generous timeouts accommodate:
- Slow CI environments
- Cold starts
- Report generation operations

## Maintenance

### Updating Nginx Configuration

1. Edit `tests/e2e/nginx.conf`
2. Test configuration syntax:
   ```bash
   docker run --rm -v $(pwd)/tests/e2e/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t
   ```
3. Restart Nginx:
   ```bash
   docker restart nginx-e2e
   ```

### Adding New Routes

To add new backend routes:
1. No changes needed - all `/api/*` routes automatically proxy to backend
2. For non-API backend routes, add new `location` blocks in nginx.conf

### Debugging

Enable debug logging in `nginx.conf`:
```nginx
error_log /var/log/nginx/error.log debug;
```

View logs:
```bash
docker logs -f nginx-e2e
```

## References

- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Playwright Configuration](https://playwright.dev/docs/test-configuration)
- [Vite Proxy Configuration](https://vitejs.dev/config/server-options.html#server-proxy)
