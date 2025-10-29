# Authentication Integration Guide

This guide shows how to integrate the JWT authentication system with existing Gecko Advisor endpoints.

## Quick Start

1. **Add JWT_SECRET to environment**:
   ```bash
   # Generate a secure secret
   openssl rand -base64 32

   # Add to .env
   echo "JWT_SECRET=<generated-secret>" >> .env
   ```

2. **Start the backend**:
   ```bash
   cd apps/backend
   pnpm dev
   ```

3. **Test authentication**:
   ```bash
   ./test-auth.sh
   ```

## Integrating with Scan Endpoints

### Option 1: Optional Authentication (Recommended)

Use `optionalAuth` middleware to support both anonymous and authenticated users.

**Example: Update scan submission endpoint**

```typescript
import { optionalAuth } from '../middleware/auth.js';

// Before (anonymous only):
router.post('/url', async (req, res) => {
  const scan = await createScan({
    url: req.body.url,
    scannerIp: req.ip
  });
  res.json({ scan });
});

// After (supports both):
router.post('/url', optionalAuth, async (req, res) => {
  const user = (req as typeof req & { user?: SafeUser }).user;

  const scan = await createScan({
    url: req.body.url,
    userId: user?.id,        // Associate with user if logged in
    scannerIp: user ? undefined : req.ip,  // Only track IP for anonymous
    isPublic: true,          // Free users: always public
  });

  res.json({ scan });
});
```

### Option 2: Authenticated Only

Use `requireAuth` for endpoints that require login.

**Example: User's scan history**

```typescript
import { requireAuth } from '../middleware/auth.js';
import type { SafeUser } from '../services/authService.js';

router.get('/history', requireAuth, async (req, res) => {
  const user = (req as typeof req & { user?: SafeUser }).user;

  if (!user) {
    return problem(res, 401, 'Unauthorized');
  }

  const scans = await prisma.scan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json({ scans });
});
```

### Option 3: Pro Tier Only

Use `requirePro` for premium features.

**Example: Batch scanning**

```typescript
import { requirePro } from '../middleware/auth.js';
import type { SafeUser } from '../services/authService.js';

router.post('/batch', requirePro, async (req, res) => {
  const user = (req as typeof req & { user?: SafeUser }).user;

  if (!user) {
    return problem(res, 401, 'Unauthorized');
  }

  const { urls } = req.body;

  // Pro users can scan unlimited URLs
  const jobs = await Promise.all(
    urls.map(url => createScanJob({
      url,
      userId: user.id,
      isProScan: true
    }))
  );

  res.json({ jobs });
});
```

## Rate Limiting Integration

### Anonymous Users (IP-based)

```typescript
export async function checkRateLimit(identifier: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const rateLimit = await prisma.rateLimit.upsert({
    where: {
      identifier_date: { identifier, date: today }
    },
    create: {
      identifier,
      date: today,
      scansCount: 1,
    },
    update: {
      scansCount: { increment: 1 }
    }
  });

  // Anonymous: 3 scans/day
  return rateLimit.scansCount <= 3;
}
```

### Authenticated Users

```typescript
router.post('/url', optionalAuth, async (req, res) => {
  const user = (req as typeof req & { user?: SafeUser }).user;

  // Check rate limit
  const identifier = user ? user.id : req.ip;
  const allowed = await checkRateLimit(identifier);

  if (!allowed) {
    // Pro users bypass rate limits
    if (user?.subscription !== 'PRO' && user?.subscription !== 'TEAM') {
      return problem(res, 429, 'Too Many Requests',
        user
          ? 'Free tier allows 3 scans per day. Upgrade to Pro for unlimited scans.'
          : 'Anonymous users are limited to 3 scans per day. Create a free account for scan history.'
      );
    }
  }

  // Create scan...
});
```

## Database Query Patterns

### User's Scans

```typescript
// Get all scans for a user
const scans = await prisma.scan.findMany({
  where: { userId: user.id },
  orderBy: { createdAt: 'desc' },
  include: {
    _count: {
      select: { evidence: true, issues: true }
    }
  }
});
```

### Public vs Private Scans

```typescript
// Pro users can make scans private
router.post('/url', requireAuth, async (req, res) => {
  const user = (req as typeof req & { user?: SafeUser }).user;
  const { url, isPrivate } = req.body;

  // Only Pro users can create private scans
  const canBePrivate = user?.subscription === 'PRO' || user?.subscription === 'TEAM';

  const scan = await createScan({
    url,
    userId: user?.id,
    isPublic: canBePrivate ? !isPrivate : true,
    isProScan: canBePrivate,
  });

  res.json({ scan });
});
```

### Recent Public Reports

```typescript
// Only show public reports
const recentReports = await prisma.scan.findMany({
  where: {
    status: 'done',
    isPublic: true,  // Only public scans
  },
  orderBy: { createdAt: 'desc' },
  take: 10,
});
```

## Frontend Integration

### Login Flow

```typescript
// 1. User logs in
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { token, user } = await loginResponse.json();

// 2. Store token
localStorage.setItem('authToken', token);
localStorage.setItem('user', JSON.stringify(user));

// 3. Use token for requests
const scanResponse = await fetch('/api/scan/url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ url: 'https://example.com' })
});
```

### Token Refresh Strategy

Since tokens expire after 7 days:

```typescript
// Check if token is expired (optional - backend will reject expired tokens)
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

// Redirect to login if token expired
if (isTokenExpired(token)) {
  localStorage.removeItem('authToken');
  window.location.href = '/login';
}
```

### Axios Interceptor Pattern

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Add token to all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Usage
const scan = await api.post('/scan/url', { url });
```

## Testing Authenticated Endpoints

### Manual Testing with curl

```bash
# 1. Login and get token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  | jq -r '.token')

# 2. Use token for authenticated requests
curl -X POST http://localhost:5000/api/scan/url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url":"https://example.com"}'

# 3. Get user profile
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Automated Testing

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('Authenticated Scan Endpoints', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    // Register test user
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'testpass123'
      });

    token = response.body.token;
    userId = response.body.user.id;
  });

  it('should create scan with user association', async () => {
    const response = await request(app)
      .post('/api/scan/url')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com' });

    expect(response.status).toBe(200);
    expect(response.body.scan.userId).toBe(userId);
  });

  it('should get user scan history', async () => {
    const response = await request(app)
      .get('/api/scans/history')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.scans).toBeInstanceOf(Array);
  });
});
```

## Common Patterns

### TypeScript Helper for req.user

Create a helper to avoid repetitive type assertions:

```typescript
// src/utils/auth.ts
import type { Request } from 'express';
import type { SafeUser } from '../services/authService.js';

export function getAuthUser(req: Request): SafeUser | undefined {
  return (req as Request & { user?: SafeUser }).user;
}

// Usage in routes:
import { getAuthUser } from '../utils/auth.js';

router.post('/url', optionalAuth, async (req, res) => {
  const user = getAuthUser(req);

  if (user) {
    // User is logged in
  } else {
    // Anonymous user
  }
});
```

### Subscription Check Helper

```typescript
export function isPro(user?: SafeUser): boolean {
  if (!user) return false;
  return (
    (user.subscription === 'PRO' || user.subscription === 'TEAM') &&
    (user.subscriptionStatus === 'ACTIVE' || user.subscriptionStatus === 'TRIALING')
  );
}

// Usage:
router.post('/batch', requireAuth, async (req, res) => {
  const user = getAuthUser(req);

  if (!isPro(user)) {
    return problem(res, 403, 'Forbidden', 'Pro subscription required');
  }

  // Process batch scan...
});
```

## Migration Checklist

- [ ] Add `JWT_SECRET` to environment variables
- [ ] Update scan endpoints to use `optionalAuth` middleware
- [ ] Associate scans with `userId` when authenticated
- [ ] Implement rate limiting based on user vs IP
- [ ] Add scan history endpoint with `requireAuth`
- [ ] Create Pro-only endpoints with `requirePro`
- [ ] Update frontend to handle authentication
- [ ] Implement token storage and refresh logic
- [ ] Update OpenAPI documentation with auth headers
- [ ] Add integration tests for authenticated endpoints
- [ ] Update CORS to allow Authorization header (already done)
- [ ] Consider implementing email verification flow
- [ ] Consider implementing password reset flow

## Security Considerations

1. **Never expose sensitive data**:
   - `passwordHash` is filtered out by `sanitizeUser()`
   - Tokens should be stored securely (httpOnly cookies preferred over localStorage)
   - Use HTTPS in production

2. **Token expiration**:
   - Tokens expire after 7 days
   - Consider implementing refresh tokens for longer sessions
   - Frontend should handle 401 errors gracefully

3. **Rate limiting**:
   - Apply rate limits to authentication endpoints
   - Protect against brute force attacks
   - Consider implementing account lockout after failed attempts

4. **Input validation**:
   - All inputs validated with Zod schemas
   - Email format checked
   - Password minimum length enforced

5. **Error messages**:
   - Generic error messages for authentication failures
   - Don't reveal if email exists during login attempts
   - Log detailed errors server-side only

## Next Steps

1. **Email Verification**: Implement email verification for new accounts
2. **Password Reset**: Add forgot password / reset password flow
3. **Refresh Tokens**: Implement refresh token rotation for longer sessions
4. **OAuth**: Add Google/GitHub OAuth for easier signup
5. **2FA**: Implement two-factor authentication for Pro accounts
6. **API Keys**: Allow Pro users to generate and manage API keys
7. **Webhooks**: Allow Pro users to configure webhooks for scan results
8. **Team Management**: Implement team features for TEAM subscription tier
