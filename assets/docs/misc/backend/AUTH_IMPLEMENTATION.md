# JWT Authentication Implementation

Complete JWT-based authentication system for Privacy Advisor supporting anonymous users, email-only accounts, and full registration with passwords.

## Overview

Privacy Advisor now supports three authentication levels:

1. **Anonymous**: No token required, rate limited by IP (3 scans/day)
2. **Free Account**: JWT token provided, same rate limits, but gets scan history
3. **Pro Account**: JWT token provided, unlimited scans, all premium features

## Environment Configuration

Add the following to your `.env` file:

```bash
# JWT Secret (REQUIRED)
# Generate a secure random string for production
# Example: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**IMPORTANT**: Change the JWT_SECRET in production to a secure random value!

## Architecture

### Components

1. **AuthService** (`src/services/authService.ts`)
   - Handles user registration, login, and token management
   - Password hashing with bcrypt (10 salt rounds)
   - JWT token generation (7-day expiration)
   - API key generation for Pro users

2. **Auth Middleware** (`src/middleware/auth.ts`)
   - `optionalAuth`: Attempts to authenticate but doesn't block if no token
   - `requireAuth`: Requires valid JWT token, returns 401 if missing
   - `requirePro`: Requires active Pro/Team subscription, returns 403 if not Pro

3. **Auth Routes** (`src/routes/auth.ts`)
   - POST `/api/auth/create-account` - Email-only account
   - POST `/api/auth/register` - Full registration with password
   - POST `/api/auth/login` - Login with credentials
   - GET `/api/auth/me` - Get current user (requires auth)

4. **TypeScript Types** (`src/types/express.d.ts`)
   - Extended Express Request to include `user` property
   - SafeUser type (no sensitive fields like passwordHash)

## API Endpoints

### 1. Create Email-Only Account

Create account with just email (no password required).

```bash
curl -X POST http://localhost:5000/api/auth/create-account \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

**Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": null,
    "subscription": "FREE",
    "subscriptionStatus": "INACTIVE",
    "apiKey": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid email format
- `409 Conflict`: Email already exists

### 2. Register with Password

Full registration with email, password, and optional name.

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
  }'
```

**Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "John Doe",
    "subscription": "FREE",
    "subscriptionStatus": "INACTIVE",
    "apiKey": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Validation:**
- Email must be valid format
- Password must be at least 8 characters
- Name is optional

**Error Responses:**
- `400 Bad Request`: Invalid email/password format
- `409 Conflict`: Email already exists

### 3. Login

Login with email and password.

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "John Doe",
    "subscription": "FREE",
    "subscriptionStatus": "INACTIVE",
    "apiKey": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid email/password format
- `401 Unauthorized`: Invalid credentials

**Note**: Email-only accounts (created via `/create-account`) cannot login because they have no password.

### 4. Get Current User

Get authenticated user's profile.

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <your-token>"
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "John Doe",
    "subscription": "PRO",
    "subscriptionStatus": "ACTIVE",
    "apiKey": "pa_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

## Using Auth Middleware

### Optional Authentication

Use for endpoints that work for both anonymous and authenticated users:

```typescript
import { optionalAuth } from './middleware/auth.js';

router.post('/scan/url', optionalAuth, async (req, res) => {
  // req.user will be defined if authenticated, undefined if anonymous
  if (req.user) {
    // Associate scan with user
    await createScan({ userId: req.user.id, ... });
  } else {
    // Track by IP for anonymous user
    await createScan({ scannerIp: req.ip, ... });
  }
});
```

### Required Authentication

Use for endpoints that require any level of authentication:

```typescript
import { requireAuth } from './middleware/auth.js';

router.get('/scans/history', requireAuth, async (req, res) => {
  // req.user is guaranteed to be defined here
  const scans = await getScansByUserId(req.user.id);
  res.json({ scans });
});
```

### Pro Tier Required

Use for Pro-only features:

```typescript
import { requirePro } from './middleware/auth.js';

router.post('/scans/batch', requirePro, async (req, res) => {
  // req.user is guaranteed to be Pro/Team with ACTIVE/TRIALING status
  await processBatchScan(req.user.id, req.body.urls);
  res.json({ success: true });
});
```

## Security Features

### Password Security
- Passwords hashed using bcrypt with 10 salt rounds
- Constant-time comparison for password verification
- Minimum password length: 8 characters
- Passwords never stored in plain text or returned in responses

### JWT Tokens
- Signed with HS256 algorithm
- 7-day expiration (configurable)
- Includes only userId in payload (minimal data)
- Verified on every authenticated request

### API Keys
- Format: `pa_[32 random alphanumeric chars]`
- Only available to Pro/Team users
- Can be used for programmatic API access
- Stored securely in database

### Error Handling
- All errors follow RFC7807 problem details format
- Sensitive error details never exposed in production
- Generic error messages for authentication failures
- Detailed logging for debugging (not exposed to users)

### Input Validation
- Zod schemas for all request bodies
- Email format validation
- Password strength requirements
- Sanitized error messages

## Database Schema

The User model (already in `infra/prisma/schema.prisma`):

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String?
  passwordHash    String?   // null for email-only accounts
  emailVerified   Boolean   @default(false)

  subscription    Subscription @default(FREE)
  subscriptionStatus SubscriptionStatus @default(INACTIVE)

  apiKey          String?   @unique

  scans           Scan[]
  watchedUrls     WatchedUrl[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum Subscription {
  FREE
  PRO
  TEAM
}

enum SubscriptionStatus {
  INACTIVE
  ACTIVE
  PAST_DUE
  CANCELED
  TRIALING
}
```

## Integration Examples

### Frontend Login Flow

```typescript
// Login
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword123'
  })
});

const { token, user } = await response.json();

// Store token (localStorage, cookies, etc.)
localStorage.setItem('authToken', token);

// Use token for authenticated requests
const scanResponse = await fetch('http://localhost:5000/api/scan/url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ url: 'https://example.com' })
});
```

### Backend Scan Service Integration

```typescript
// Update scan service to support user association
export async function createScan(params: {
  url: string;
  userId?: string;  // Optional - from req.user if authenticated
  scannerIp?: string;  // For anonymous users
}) {
  const scan = await prisma.scan.create({
    data: {
      input: params.url,
      userId: params.userId,
      scannerIp: params.scannerIp,
      isPublic: true,  // Free users: always public, Pro users: can be private
      // ... other fields
    }
  });

  return scan;
}
```

## Testing

### Test Email-Only Account
```bash
# Create account
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/create-account \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' \
  | jq -r '.token')

# Use token
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Test Full Registration
```bash
# Register
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"securepass123",
    "name":"Test User"
  }' | jq -r '.token')

# Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"securepass123"
  }' | jq -r '.token')

# Get profile
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## Next Steps

1. **Frontend Integration**
   - Build login/register UI components
   - Implement token storage and refresh logic
   - Add protected routes for authenticated users

2. **Scan Service Integration**
   - Update scan endpoints to use `optionalAuth` middleware
   - Associate scans with users when authenticated
   - Implement scan history for logged-in users

3. **Pro Features**
   - Add subscription management (Stripe integration)
   - Implement unlimited scans for Pro users
   - Add private scan reports for Pro users
   - Enable batch scanning for Pro users

4. **Email Verification**
   - Add email verification flow
   - Send verification emails on registration
   - Require email verification for certain features

5. **Password Reset**
   - Implement forgot password flow
   - Send password reset emails
   - Add reset token verification

## Troubleshooting

### "JWT_SECRET environment variable not set"
Add `JWT_SECRET=your-secret-key` to your `.env` file.

### "Email already exists"
The email is already registered. Use the login endpoint instead.

### "Invalid credentials"
Check email/password are correct. Email-only accounts cannot login.

### "Token expired"
JWT tokens expire after 7 days. User needs to login again.

### CORS errors
Ensure frontend origin is in `ALLOWED_ORIGINS` environment variable.
Authorization header is now allowed in CORS configuration.

## Files Modified/Created

### Created:
- `/apps/backend/src/services/authService.ts` - Authentication service
- `/apps/backend/src/middleware/auth.ts` - Auth middleware
- `/apps/backend/src/routes/auth.ts` - Auth routes

### Modified:
- `/apps/backend/src/types/express.d.ts` - Added req.user type
- `/apps/backend/src/server.ts` - Registered auth routes, added Authorization header to CORS
- `/apps/backend/package.json` - Added bcryptjs, jsonwebtoken dependencies

## Dependencies Installed

```bash
pnpm add bcryptjs jsonwebtoken --filter @privacy-advisor/backend
pnpm add -D @types/bcryptjs @types/jsonwebtoken --filter @privacy-advisor/backend
```
