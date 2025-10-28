# Nginx Reverse Proxy for E2E Testing

## Quick Start

### Option 1: Start Everything Together (Recommended)

```bash
# Start backend + frontend + nginx in one command
./tests/e2e/scripts/start-e2e-stack.sh
```

This will:
- Check all prerequisites (Node.js, pnpm, Nginx, PostgreSQL, Redis)
- Start backend on port 5000
- Start frontend on port 5173
- Start Nginx reverse proxy on port 8080
- Verify all services are healthy
- Keep everything running until you press Ctrl+C

### Option 2: Start Services Manually

```bash
# Terminal 1: Start backend
cd apps/backend
PORT=5000 pnpm dev

# Terminal 2: Start frontend
cd apps/frontend
FRONTEND_PORT=5173 pnpm dev

# Terminal 3: Start Nginx
./tests/e2e/scripts/start-nginx.sh foreground

# Terminal 4: Verify everything is working
node tests/e2e/scripts/verify-stack.js
```

## What You Get

```
┌─────────────────────────────────────────┐
│  E2E Tests → http://localhost:8080      │
└─────────────────────────────────────────┘
                    ↓
         ┌──────────────────┐
         │  Nginx :8080     │
         └──────────────────┘
              ↓         ↓
      ┌───────┘         └──────┐
      ↓                        ↓
┌───────────┐          ┌──────────────┐
│ Backend   │          │  Frontend    │
│  :5000    │          │   :5173      │
└───────────┘          └──────────────┘
```

**Routing:**
- `http://localhost:8080/api/*` → Backend API (port 5000)
- `http://localhost:8080/*` → Frontend (port 5173)
- `http://localhost:8080/health` → Nginx health check

## Why Nginx for E2E Testing?

1. **No CORS Issues**: All requests go through one origin (localhost:8080)
2. **Production-like Setup**: Mimics real deployment with reverse proxy
3. **Simplified Testing**: Tests don't need to manage multiple origins
4. **Consistent Environment**: Same setup in CI and local development
5. **WebSocket Support**: Vite HMR (hot reload) works through the proxy

## Backend Configuration - Already Done!

The backend is **already configured** to accept requests from `localhost:8080`:

```typescript
// apps/backend/src/config.ts:32-41
const devOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',  // ✅ E2E testing
  'http://127.0.0.1:8080',  // ✅ E2E testing
];
```

No changes needed to backend code!

## Port Configuration

| Service  | Default Port | Environment Variable | Notes                          |
|----------|--------------|----------------------|--------------------------------|
| Backend  | 5000         | `PORT` or `BACKEND_PORT` | Configured in config.ts:102 |
| Frontend | 5173         | `FRONTEND_PORT`      | Vite default                   |
| Nginx    | 8080         | N/A                  | Fixed in nginx.conf            |

## Health Checks

```bash
# Nginx health
curl http://localhost:8080/health
# Expected: "healthy"

# Backend health (via Nginx)
curl http://localhost:8080/api/healthz
# Expected: {"status":"ok","timestamp":"..."}

# Frontend (via Nginx)
curl -I http://localhost:8080
# Expected: HTTP/1.1 200 OK

# Run comprehensive verification
node tests/e2e/scripts/verify-stack.js
```

## Running E2E Tests

Once the stack is running, run your E2E tests:

```bash
# Run all tests
pnpm exec playwright test

# Run specific browser
pnpm exec playwright test --project=chromium

# Run in headed mode (see the browser)
pnpm exec playwright test --headed

# Run with UI mode
pnpm exec playwright test --ui
```

The tests will automatically use `http://localhost:8080` as configured in `playwright.config.ts`.

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 8080
lsof -t -i:8080 | xargs kill -9

# Or for backend (5000)
lsof -t -i:5000 | xargs kill -9

# Or for frontend (5173)
lsof -t -i:5173 | xargs kill -9
```

### Backend Not Responding

```bash
# Check if backend is running
curl http://localhost:5000/api/healthz

# Check backend logs
tail -f tests/e2e/logs/backend.log

# Restart backend
cd apps/backend
PORT=5000 pnpm dev
```

### Frontend Not Responding

```bash
# Check if frontend is running
curl http://localhost:5173

# Check frontend logs
tail -f tests/e2e/logs/frontend.log

# Restart frontend
cd apps/frontend
pnpm dev
```

### Nginx Not Responding

```bash
# Check Nginx status
curl http://localhost:8080/health

# Check Nginx error log
tail -f /var/log/nginx/error.log

# Test Nginx config
nginx -t -c $(pwd)/tests/e2e/nginx.conf

# Restart Nginx
./tests/e2e/scripts/stop-nginx.sh
./tests/e2e/scripts/start-nginx.sh foreground
```

### CORS Errors

If you see CORS errors in the browser console:

1. **Verify you're accessing via port 8080** (not 5173 or 5000 directly)
2. **Check backend allowed origins**:
   ```bash
   grep -A10 "devOrigins" apps/backend/src/config.ts
   ```
3. **Ensure NODE_ENV is development or test**:
   ```bash
   echo $NODE_ENV
   # Should be: development or test
   ```

### Performance Issues

The configuration is optimized for <3s response times with:
- Gzip compression for large JSON payloads
- Optimized proxy buffers (16k x 8)
- Keepalive connections
- Reasonable timeouts (60s)

If you experience slowness:
```bash
# Check response times
node tests/e2e/scripts/verify-stack.js

# Or manually test
curl -w "@-" -o /dev/null -s http://localhost:8080/api/healthz <<'EOF'
time_total: %{time_total}s
EOF
```

## GitHub Actions Integration

The E2E tests workflow (`.github/workflows/e2e-tests.yml`) already expects this setup:

```yaml
env:
  E2E_BASE_URL: http://localhost:8080
```

To integrate Nginx into CI:

```yaml
- name: Start E2E stack
  run: |
    # Start backend and frontend
    pnpm dev &
    sleep 10

    # Start Nginx
    sudo nginx -c $(pwd)/tests/e2e/nginx.conf

    # Wait for health check
    timeout 120 bash -c 'until curl -f http://localhost:8080/health; do sleep 2; done'

- name: Run E2E tests
  run: pnpm exec playwright test
  env:
    E2E_BASE_URL: http://localhost:8080

- name: Stop services
  if: always()
  run: |
    sudo nginx -s stop
    pkill -f "pnpm dev" || true
```

## Files Created

```
tests/e2e/
├── nginx.conf                    # Nginx reverse proxy configuration
├── NGINX_SETUP.md                # Detailed setup guide
├── README-NGINX.md               # This file (quick reference)
└── scripts/
    ├── start-nginx.sh            # Start only Nginx
    ├── stop-nginx.sh             # Stop Nginx
    ├── start-e2e-stack.sh        # Start everything (backend + frontend + nginx)
    └── verify-stack.js           # Comprehensive health check script
```

## Advanced Usage

### Running in CI/CD

For GitHub Actions, run Nginx in background:

```bash
# Start services
pnpm dev &
sleep 10

# Start Nginx in background
nginx -c $(pwd)/tests/e2e/nginx.conf

# Wait for services
timeout 120 bash -c 'until curl -f http://localhost:8080/health; do sleep 2; done'

# Run tests
pnpm exec playwright test

# Cleanup
nginx -s stop
pkill -f "pnpm dev"
```

### Custom Ports

If you need different ports, edit `nginx.conf`:

```nginx
# Change upstream backend port
upstream backend {
    server host.docker.internal:3000;  # Change from 5000
}

# Change nginx listen port
server {
    listen 9000;  # Change from 8080
}
```

Then update your environment:
```bash
export E2E_BASE_URL=http://localhost:9000
export PORT=3000
```

### Docker Compose Integration

The nginx.conf uses `host.docker.internal` for upstream servers, making it compatible with Docker Compose:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "8080:8080"
    volumes:
      - ./tests/e2e/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
      - frontend
```

## Support

For issues or questions:
1. Check this guide and `NGINX_SETUP.md`
2. Run verification script: `node tests/e2e/scripts/verify-stack.js`
3. Check logs in `tests/e2e/logs/` and `/var/log/nginx/`
4. Open an issue on GitHub with logs and configuration

---

**Quick Commands Reference:**

```bash
# Start everything
./tests/e2e/scripts/start-e2e-stack.sh

# Start only Nginx (requires backend + frontend running)
./tests/e2e/scripts/start-nginx.sh

# Stop Nginx
./tests/e2e/scripts/stop-nginx.sh

# Verify stack
node tests/e2e/scripts/verify-stack.js

# Run E2E tests
pnpm exec playwright test

# Check health
curl http://localhost:8080/health
curl http://localhost:8080/api/healthz
```
