# Authentication Quick Start Guide

5-minute guide to get authentication working in Privacy Advisor.

## Setup (1 minute)

```bash
# 1. Add JWT_SECRET to environment
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# 2. Verify dependencies installed (should already be done)
pnpm install

# 3. Start backend
pnpm dev
```

## Test It Works (1 minute)

```bash
# Run automated tests
./test-auth.sh

# Or manually test:
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Use in Your Routes (3 minutes)

### Pattern 1: Anonymous OR Authenticated

```typescript
import { optionalAuth } from '../middleware/auth.js';
import type { SafeUser } from '../services/authService.js';

router.post('/scan', optionalAuth, async (req, res) => {
  const user = (req as typeof req & { user?: SafeUser }).user;

  // user will be undefined for anonymous, defined for logged-in
  if (user) {
    // Save scan to user's history
  } else {
    // Track by IP for rate limiting
  }
});
```

### Pattern 2: Login Required

```typescript
import { requireAuth } from '../middleware/auth.js';
import type { SafeUser } from '../services/authService.js';

router.get('/history', requireAuth, async (req, res) => {
  const user = (req as typeof req & { user?: SafeUser }).user!;
  // user is guaranteed to exist here

  const scans = await prisma.scan.findMany({
    where: { userId: user.id }
  });
  res.json({ scans });
});
```

### Pattern 3: Pro Users Only

```typescript
import { requirePro } from '../middleware/auth.js';
import type { SafeUser } from '../services/authService.js';

router.post('/batch', requirePro, async (req, res) => {
  const user = (req as typeof req & { user?: SafeUser }).user!;
  // user is guaranteed to be Pro/Team with active subscription

  // Process unlimited batch scans
});
```

## API Endpoints

### Register
```bash
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"  # optional
}
→ Returns: { token, user }
```

### Login
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
→ Returns: { token, user }
```

### Email-Only Account
```bash
POST /api/auth/create-account
{
  "email": "user@example.com"
}
→ Returns: { token, user }
```

### Get Profile
```bash
GET /api/auth/me
Authorization: Bearer <token>
→ Returns: { user }
```

## Frontend Usage

```typescript
// 1. Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token, user } = await response.json();

// 2. Store token
localStorage.setItem('authToken', token);

// 3. Use token
fetch('/api/scan/url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ url: 'https://example.com' })
});
```

## User Types

| Type | Token? | Rate Limit | Scan History | Private Reports |
|------|--------|------------|--------------|-----------------|
| Anonymous | ❌ | 3/day by IP | ❌ | ❌ |
| Free | ✅ | 3/day | ✅ | ❌ |
| Pro | ✅ | Unlimited | ✅ | ✅ |

## Common Patterns

### Get current user safely
```typescript
const user = (req as typeof req & { user?: SafeUser }).user;
```

### Check if Pro
```typescript
const isPro = user?.subscription === 'PRO' &&
              user?.subscriptionStatus === 'ACTIVE';
```

### Handle authentication errors
```typescript
try {
  // auth logic
} catch (error) {
  if (error.message === 'INVALID_CREDENTIALS') {
    return problem(res, 401, 'Unauthorized', 'Invalid credentials');
  }
}
```

## Troubleshooting

**"JWT_SECRET environment variable not set"**
→ Add `JWT_SECRET=xxx` to .env file

**"Email already exists"**
→ Email is registered, use login instead

**"Invalid credentials"**
→ Wrong password or email-only account trying to login

**CORS errors**
→ Authorization header is already configured in server.ts

## Security Checklist

- [x] JWT_SECRET is set and secure (32+ random characters)
- [x] Passwords hashed with bcrypt (not plain text)
- [x] Tokens expire after 7 days
- [x] Email validation on registration
- [x] Password minimum 8 characters
- [x] Generic error messages (no info leakage)
- [x] HTTPS in production
- [ ] Rate limit auth endpoints (TODO)
- [ ] Account lockout after failed attempts (TODO)

## What's Next?

1. Update your scan endpoints to use `optionalAuth`
2. Create a login/register UI in frontend
3. Implement scan history for authenticated users
4. Add Pro-only features (batch scan, private reports)

**Full Documentation**: See `AUTH_IMPLEMENTATION.md` and `INTEGRATION_GUIDE.md`
