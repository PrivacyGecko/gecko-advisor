# E2E Testing with Nginx Reverse Proxy Setup

This document explains how the Gecko Advisor E2E testing infrastructure works with the Nginx reverse proxy configuration.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    E2E Tests (Playwright)               │
│                  Access via port 8080                   │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Nginx (8080)  │
         │  Reverse Proxy │
         └────────┬───────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
   ┌──────────┐      ┌──────────┐
   │  Backend │      │ Frontend │
   │  (5000)  │      │  (5173)  │
   │ Express  │      │   Vite   │
   └────┬─────┘      └──────────┘
        │
   ┌────┴─────┐
   │          │
   ▼          ▼
┌────────┐ ┌───────┐
│  DB    │ │ Redis │
│ (5432) │ │ (6379)│
└────────┘ └───────┘
```

## Routing Configuration

### Nginx Routes (Port 8080)

- `/api/*` → Backend (port 5000)
  - All API calls are proxied to Express backend
  - Example: `http://localhost:8080/api/scan/url` → `http://backend:5000/api/scan/url`

- `/*` → Frontend (port 5173 in dev, static files in prod)
  - All other requests go to React frontend
  - Example: `http://localhost:8080/` → `http://frontend:5173/`
  - HMR WebSocket connections are also proxied for hot reload

## Vite Configuration

### Development Server Settings

The Vite config (`apps/frontend/vite.config.ts`) includes:

```typescript
server: {
  port: 5173,
  host: '0.0.0.0', // CRITICAL: Binds to all interfaces for Docker accessibility
  proxy: {
    '/api': {
      target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
    },
  },
  cors: {
    origin: true,
    credentials: true,
  },
}
```

### Key Configuration Points

1. **`host: '0.0.0.0'`**: Essential for Docker/CI environments
   - Allows Nginx container to access Vite dev server
   - Without this, Vite only listens on localhost inside container

2. **Proxy Configuration**:
   - In local dev: proxies to `localhost:5000`
   - In Docker: set `VITE_API_PROXY_TARGET=http://backend:5000`
   - This is NOT used in E2E tests (Nginx handles routing)

3. **CORS Settings**:
   - Enabled for development server
   - Allows requests from Nginx proxy

## Environment Variables

### Frontend (.env)

```bash
# Vite dev server port
FRONTEND_PORT=5173

# API proxy target (for Docker)
VITE_API_PROXY_TARGET=http://backend:5000

# HMR host (for WebSocket connections)
VITE_HMR_HOST=localhost
```

### Backend (.env)

```bash
# Backend API port
BACKEND_PORT=5000

# Allowed origins for CORS
ALLOW_ORIGIN=http://localhost:8080
FRONTEND_PUBLIC_URL=http://localhost:8080
```

### E2E Tests (.env.test)

```bash
# E2E tests always access through Nginx proxy
E2E_BASE_URL=http://localhost:8080
```

## Docker Compose Configurations

### E2E Testing Setup

Use `docker-compose.e2e.yml` for E2E testing:

```bash
# Start E2E environment
docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.e2e.yml up

# Access application
curl http://localhost:8080        # Frontend
curl http://localhost:8080/api/health  # Backend API

# Run E2E tests
pnpm test:e2e
```

### Production Setup

Use standard `docker-compose.yml` + `docker-compose.prod.yml`:

```bash
# Production uses Nginx to serve static frontend files
# No Vite dev server running
docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.prod.yml up
```

## Frontend API Integration

### API Client Configuration

The frontend API client (`apps/frontend/src/lib/api.ts`) uses **relative URLs**:

```typescript
export async function startUrlScan(url: string) {
  const res = await fetch('/api/scan/url', {  // ← Relative URL
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return res.json();
}
```

### Why Relative URLs?

1. **Nginx Routing**: When accessed via `http://localhost:8080`, Nginx routes `/api/*` to backend
2. **No CORS Issues**: Same origin (both on port 8080 from client perspective)
3. **Environment Agnostic**: Works in dev, staging, and production without changes

### Development Modes

#### Mode 1: E2E Testing (Recommended)
```bash
# Everything through Nginx on port 8080
docker compose -f infra/docker/docker-compose.e2e.yml up
# Access: http://localhost:8080
```

#### Mode 2: Direct Development
```bash
# Terminal 1: Start backend
cd apps/backend
pnpm dev  # Port 5000

# Terminal 2: Start frontend
cd apps/frontend
pnpm dev  # Port 5173, proxies /api to localhost:5000

# Access: http://localhost:5173
```

## Playwright Configuration

### Base URL Configuration

```typescript
// tests/e2e/playwright.config.ts
export default defineConfig({
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
  },
});
```

### Global Setup

The global setup (`tests/e2e/global-setup.ts`) verifies the application is accessible:

```typescript
await page.goto(baseURL); // http://localhost:8080
await page.waitForSelector('text=Gecko Advisor');
```

## CI/GitHub Actions Configuration

The E2E test workflow (`.github/workflows/e2e-tests.yml`) runs tests against port 8080:

```yaml
- name: Wait for application to be ready
  run: |
    timeout 120 bash -c 'until curl -f http://localhost:8080; do sleep 2; done'

- name: Run E2E tests
  run: pnpm exec playwright test
  env:
    E2E_BASE_URL: http://localhost:8080
```

## Troubleshooting

### Issue: "Application not accessible from E2E tests"

**Symptom**: Tests timeout connecting to `http://localhost:8080`

**Solutions**:
1. Ensure Vite has `host: '0.0.0.0'` in config
2. Check Nginx is running: `docker compose ps`
3. Verify Nginx configuration: `docker compose logs nginx`
4. Test Nginx routing: `curl http://localhost:8080/api/health`

### Issue: "API calls return 404"

**Symptom**: Frontend loads but API calls fail

**Solutions**:
1. Check backend is healthy: `curl http://localhost:8080/api/health`
2. Verify Nginx routing: `docker compose logs nginx | grep /api`
3. Check backend logs: `docker compose logs backend`
4. Ensure API calls use `/api` prefix (not full URL)

### Issue: "CORS errors in browser"

**Symptom**: Browser console shows CORS policy errors

**Solutions**:
1. Verify backend CORS configuration includes `http://localhost:8080`
2. Check `ALLOW_ORIGIN` environment variable
3. Ensure API calls use relative URLs (`/api/...` not `http://localhost:5000/api/...`)

### Issue: "Hot reload not working"

**Symptom**: Code changes don't reflect in browser

**Solutions**:
1. Check Vite HMR WebSocket connection: Browser DevTools → Network → WS
2. Verify Nginx proxies `/ws` location correctly
3. Check HMR environment variables: `VITE_HMR_HOST=localhost`
4. Ensure frontend volumes are mounted correctly in docker-compose

### Issue: "Production build doesn't work with Nginx"

**Symptom**: 404 errors on refresh or direct navigation

**Solutions**:
1. Verify Nginx serves `index.html` for SPA routes: `try_files $uri /index.html`
2. Check build output exists: `ls apps/frontend/dist`
3. Ensure Nginx volume mount is correct: `./apps/frontend/dist:/usr/share/nginx/html`

## Performance Considerations

### Build Optimization

The Vite configuration includes:
- Code splitting for vendor, components, and pages
- Modern browser targets (ES2020)
- Tree shaking and minification
- Source maps in development only

### Bundle Size Targets

- Total bundle: < 2MB
- Individual chunks: < 500KB warning threshold
- Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

## Security Considerations

### Production Nginx Headers

```nginx
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options SAMEORIGIN always;
add_header Content-Security-Policy "default-src 'self'; ...";
```

### Development vs Production

- **Development**: Relaxed CORS for local testing
- **Production**: Strict CSP and CORS policies
- **E2E**: Test environment with controlled origins

## Additional Resources

- [Vite Server Options](https://vitejs.dev/config/server-options.html)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Playwright Configuration](https://playwright.dev/docs/test-configuration)
- [Docker Compose Networking](https://docs.docker.com/compose/networking/)
