# Vite Configuration Reference for Gecko Advisor

## Quick Reference

### Critical Settings for E2E Testing

```typescript
server: {
  host: '0.0.0.0',  // ✅ MUST be set for Docker/CI
  port: 5173,       // Default Vite port
  proxy: {
    '/api': {
      target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
    }
  }
}
```

## Configuration Breakdown

### 1. Server Configuration

#### host: '0.0.0.0'
**Purpose**: Binds Vite dev server to all network interfaces

**Why it matters**:
- Without this: Vite only listens on `127.0.0.1` inside container
- Nginx container cannot reach frontend container
- E2E tests fail to load application

**Environments**:
- ✅ Required: Docker, CI/GitHub Actions
- ✅ Safe: Local development (still accessible via localhost)

#### port: Number(process.env.FRONTEND_PORT || 5173)
**Purpose**: Configurable port for Vite dev server

**Usage**:
```bash
# Default
FRONTEND_PORT=5173

# Custom port
FRONTEND_PORT=3000
```

### 2. Proxy Configuration

#### Purpose
Proxies API calls from frontend to backend during development

#### When It's Used
- ✅ **Local dev**: `pnpm dev` (direct Vite access on port 5173)
- ❌ **E2E tests**: Not used (Nginx handles routing on port 8080)
- ❌ **Production**: Not used (Nginx handles routing)

#### Configuration
```typescript
proxy: {
  '/api': {
    target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
    changeOrigin: true,  // Changes origin header to target
    secure: false,       // Allows self-signed certificates
  }
}
```

#### Environment-Specific Targets

| Environment | VITE_API_PROXY_TARGET | Result |
|-------------|----------------------|--------|
| Local dev | `http://localhost:5000` | Proxies to local backend |
| Docker dev | `http://backend:5000` | Proxies to backend container |
| E2E tests | Not used | Nginx handles routing |

### 3. CORS Configuration

```typescript
cors: {
  origin: true,        // Allow all origins in dev
  credentials: true,   // Allow cookies/auth headers
}
```

**Purpose**: Enables cross-origin requests during development

**Production**: Handled by backend CORS middleware

### 4. HMR Configuration

```typescript
hmr: {
  host: process.env.VITE_HMR_HOST || 'localhost',
  port: Number(process.env.FRONTEND_PORT || 5173),
}
```

**Purpose**: Hot Module Replacement WebSocket configuration

**Why it matters**:
- Enables live reload during development
- Must match frontend port for WebSocket connection

### 5. Preview Configuration

```typescript
preview: {
  port: 5173,
  host: '0.0.0.0',  // Same as dev server
  cors: true,
}
```

**Purpose**: Configuration for `vite preview` (production build testing)

## Environment Variables

### Frontend-Specific Variables

```bash
# apps/frontend/.env

# Vite dev server port (default: 5173)
FRONTEND_PORT=5173

# API proxy target for Vite proxy (Docker/dev)
VITE_API_PROXY_TARGET=http://localhost:5000

# HMR WebSocket host (usually localhost)
VITE_HMR_HOST=localhost

# Solana RPC endpoint (optional, for wallet features)
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### Important Notes

1. **VITE_ prefix**: Required for variables exposed to browser
   - ✅ `VITE_API_BASE_URL` → Available in browser
   - ❌ `API_BASE_URL` → Not available in browser

2. **VITE_API_PROXY_TARGET**: Only affects Vite's proxy
   - Does NOT affect fetch calls in browser
   - Only used during `pnpm dev` when accessing via port 5173

## Common Scenarios

### Scenario 1: Local Development

```bash
# Terminal 1: Backend
cd apps/backend
pnpm dev  # Port 5000

# Terminal 2: Frontend
cd apps/frontend
pnpm dev  # Port 5173

# Access
http://localhost:5173  # Frontend with API proxy
http://localhost:5000/api/health  # Backend directly
```

**API Flow**:
```
Browser → http://localhost:5173/api/scan
  ↓ (Vite proxy)
  → http://localhost:5000/api/scan
```

### Scenario 2: E2E Testing

```bash
# Start all services
docker compose -f infra/docker/docker-compose.e2e.yml up

# Access
http://localhost:8080  # Everything through Nginx

# Run tests
pnpm test:e2e
```

**API Flow**:
```
Browser → http://localhost:8080/api/scan
  ↓ (Nginx proxy)
  → http://backend:5000/api/scan
```

### Scenario 3: Production

```bash
# Build frontend
pnpm build

# Start production stack
docker compose up

# Access
http://localhost:8080  # Nginx serves static files + API proxy
```

**API Flow**:
```
Browser → http://localhost:8080/api/scan
  ↓ (Nginx proxy)
  → http://backend:5000/api/scan
```

## Build Configuration

### Key Settings

```typescript
build: {
  target: ['es2020', 'chrome80', 'firefox78', 'safari14'],
  minify: 'esbuild',
  sourcemap: process.env.NODE_ENV === 'development',
  chunkSizeWarningLimit: 500, // KB
  cssCodeSplit: true,
}
```

### Manual Chunk Splitting

```typescript
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-query': ['@tanstack/react-query'],
  'vendor-utils': ['clsx', 'zod'],
}
```

**Benefits**:
- Separate vendor code for better caching
- Faster rebuilds (vendor code changes less)
- Parallel downloads in browser

### Output File Naming

```typescript
chunkFileNames: (chunkInfo) => {
  if (facadeModuleId.includes('node_modules')) return 'vendor/[name].[hash].js';
  if (facadeModuleId.includes('/pages/')) return 'pages/[name].[hash].js';
  return 'chunks/[name].[hash].js';
},
```

**Result**:
```
dist/
├── vendor/vendor-react.abc123.js
├── pages/home.def456.js
└── chunks/utils.ghi789.js
```

## Optimization Settings

### esbuild

```typescript
esbuild: {
  drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
}
```

**Purpose**: Removes `console.log()` and `debugger` statements in production

### optimizeDeps

```typescript
optimizeDeps: {
  include: [
    'react',
    'react-dom',
    'react-router-dom',
    '@tanstack/react-query',
  ],
}
```

**Purpose**: Pre-bundles dependencies for faster development startup

## Troubleshooting

### Issue: Vite dev server not accessible from Docker

**Symptom**: Nginx can't proxy to frontend
```
nginx: connect() failed (111: Connection refused) while connecting to upstream
```

**Solution**: Ensure `host: '0.0.0.0'` in vite.config.ts

### Issue: API calls fail with 404

**Symptom**: Frontend loads but API returns 404

**Check**:
1. API calls use `/api` prefix: ✅ `fetch('/api/health')`
2. Not full URLs: ❌ `fetch('http://localhost:5000/api/health')`
3. Nginx routing: `curl http://localhost:8080/api/health`

### Issue: HMR not working

**Symptom**: Code changes don't reload

**Solutions**:
1. Check WebSocket connection in DevTools (Network → WS tab)
2. Verify `hmr.host` matches your access URL
3. Ensure Nginx proxies WebSocket: `/ws` location
4. Check browser console for HMR errors

### Issue: Build works locally but fails in Docker

**Symptom**: Production build fails in CI

**Common causes**:
1. Missing dependencies in package.json
2. TypeScript errors (strict mode)
3. Environment variables not set
4. Memory limits in Docker

**Debug**:
```bash
# Build locally
pnpm build

# Build in Docker
docker compose -f docker-compose.yml build frontend
```

## Performance Monitoring

### Bundle Analysis

```bash
# Install bundle analyzer
pnpm add -D rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  visualizer({
    filename: './dist/stats.html',
    open: true,
  })
]

# Build and view
pnpm build
```

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Total bundle | < 2MB | Check with analyzer |
| Largest chunk | < 500KB | Warning threshold set |
| LCP | < 2.5s | Measure with Lighthouse |
| FID | < 100ms | Measure with Lighthouse |
| CLS | < 0.1 | Measure with Lighthouse |

## Security Considerations

### Development

- CORS enabled for all origins
- Hot reload WebSocket exposed
- Source maps included

### Production

- CORS restricted to allowed origins
- No WebSocket HMR
- Source maps optional (disabled by default)
- Console logs removed

### CSP Headers

Handled by Nginx in production:
```nginx
Content-Security-Policy: "default-src 'self'; script-src 'self'; ..."
```

## Additional Resources

- [Vite Configuration Documentation](https://vitejs.dev/config/)
- [Vite Server Options](https://vitejs.dev/config/server-options.html)
- [Vite Build Options](https://vitejs.dev/config/build-options.html)
- [Environment Variables in Vite](https://vitejs.dev/guide/env-and-mode.html)
