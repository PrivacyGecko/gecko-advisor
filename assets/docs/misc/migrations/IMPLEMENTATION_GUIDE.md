# Freemium Model Implementation Guide

## Overview
This guide provides complete implementation details for integrating the Freemium model into Gecko Advisor's backend and frontend.

## Table of Contents
1. [Database Schema Summary](#database-schema-summary)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Integration](#frontend-integration)
4. [Stripe Integration](#stripe-integration)
5. [Rate Limiting Strategy](#rate-limiting-strategy)
6. [API Endpoints](#api-endpoints)
7. [Testing Strategy](#testing-strategy)

---

## Database Schema Summary

### New Models

#### User Model
```prisma
model User {
  id                    String              @id @default(cuid())
  email                 String              @unique
  name                  String?
  passwordHash          String?
  emailVerified         Boolean             @default(false)
  subscription          Subscription        @default(FREE)
  stripeCustomerId      String?             @unique
  stripeSubscriptionId  String?             @unique
  subscriptionStatus    SubscriptionStatus  @default(INACTIVE)
  subscriptionEndsAt    DateTime?
  apiKey                String?             @unique
  apiCallsMonth         Int                 @default(0)
  apiResetAt            DateTime?
  scans                 Scan[]
  watchedUrls           WatchedUrl[]
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
}
```

#### RateLimit Model
```prisma
model RateLimit {
  id          String   @id @default(cuid())
  identifier  String   // IP address or userId
  scansCount  Int      @default(0)
  date        String   // YYYY-MM-DD
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([identifier, date])
}
```

#### WatchedUrl Model
```prisma
model WatchedUrl {
  id              String         @id @default(cuid())
  userId          String
  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  url             String
  lastScore       Int?
  lastChecked     DateTime?
  checkFrequency  CheckFrequency @default(WEEKLY)
  alertOnChange   Boolean        @default(true)
  createdAt       DateTime       @default(now())

  @@unique([userId, url])
}
```

### Enhanced Scan Model
```prisma
// Added fields:
userId      String?   // Optional link to user account
isPublic    Boolean   @default(true)  // Pro users can make private
isProScan   Boolean   @default(false) // Track Pro feature usage
scannerIp   String?   // For anonymous rate limiting
```

---

## Backend Implementation

### 1. Authentication Middleware

**File**: `apps/backend/src/middleware/auth.middleware.ts`

```typescript
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@gecko-advisor/shared/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscription: string;
    subscriptionStatus: string;
  };
}

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        subscription: true,
        subscriptionStatus: true,
      },
    });

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Invalid token, continue without authentication
    next();
  }
};

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  await optionalAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({
        type: 'https://geckoadvisor.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required',
      });
    }
    next();
  });
};

export const requirePro = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, () => {
    if (req.user!.subscription === 'FREE') {
      return res.status(403).json({
        type: 'https://geckoadvisor.com/errors/subscription-required',
        title: 'Pro Subscription Required',
        status: 403,
        detail: 'This feature requires a Pro subscription',
        upgradeUrl: 'https://geckoadvisor.com/pricing',
      });
    }
    next();
  });
};
```

### 2. Rate Limiting Middleware

**File**: `apps/backend/src/middleware/rateLimit.middleware.ts`

```typescript
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '@gecko-advisor/shared/db';

const FREE_TIER_DAILY_LIMIT = 3;

export const rateLimitScan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Pro users have unlimited scans
    if (req.user && req.user.subscription === 'PRO') {
      return next();
    }

    // Determine identifier (userId or IP)
    const identifier = req.user?.id || req.ip;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get or create rate limit record
    const rateLimit = await prisma.rateLimit.upsert({
      where: {
        identifier_date: {
          identifier,
          date: today,
        },
      },
      update: {},
      create: {
        identifier,
        date: today,
        scansCount: 0,
      },
    });

    // Check if limit exceeded
    if (rateLimit.scansCount >= FREE_TIER_DAILY_LIMIT) {
      return res.status(429).json({
        type: 'https://geckoadvisor.com/errors/rate-limit-exceeded',
        title: 'Daily Scan Limit Reached',
        status: 429,
        detail: `Free tier allows ${FREE_TIER_DAILY_LIMIT} scans per day. Upgrade to Pro for unlimited scans.`,
        scansRemaining: 0,
        scansLimit: FREE_TIER_DAILY_LIMIT,
        resetAt: new Date(today + 'T23:59:59Z').toISOString(),
        upgradeUrl: 'https://geckoadvisor.com/pricing',
      });
    }

    // Increment scan count
    await prisma.rateLimit.update({
      where: { id: rateLimit.id },
      data: { scansCount: { increment: 1 } },
    });

    // Add rate limit info to response headers
    res.setHeader('X-RateLimit-Limit', FREE_TIER_DAILY_LIMIT);
    res.setHeader('X-RateLimit-Remaining', FREE_TIER_DAILY_LIMIT - rateLimit.scansCount - 1);
    res.setHeader('X-RateLimit-Reset', new Date(today + 'T23:59:59Z').toISOString());

    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    // Don't block on rate limit errors
    next();
  }
};
```

### 3. API Key Authentication

**File**: `apps/backend/src/middleware/apiKey.middleware.ts`

```typescript
import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '@gecko-advisor/shared/db';

export const apiKeyAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        type: 'https://geckoadvisor.com/errors/api-key-required',
        title: 'API Key Required',
        status: 401,
        detail: 'Provide API key in X-API-Key header',
      });
    }

    const user = await prisma.user.findUnique({
      where: { apiKey },
      select: {
        id: true,
        email: true,
        subscription: true,
        subscriptionStatus: true,
        apiCallsMonth: true,
        apiResetAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        type: 'https://geckoadvisor.com/errors/invalid-api-key',
        title: 'Invalid API Key',
        status: 401,
        detail: 'API key not found or inactive',
      });
    }

    if (user.subscriptionStatus !== 'ACTIVE') {
      return res.status(403).json({
        type: 'https://geckoadvisor.com/errors/subscription-inactive',
        title: 'Subscription Inactive',
        status: 403,
        detail: 'Your subscription is not active',
      });
    }

    // Check if need to reset monthly counter
    const now = new Date();
    if (!user.apiResetAt || user.apiResetAt < now) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          apiCallsMonth: 1,
          apiResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        },
      });
    } else {
      // Increment API call counter
      await prisma.user.update({
        where: { id: user.id },
        data: { apiCallsMonth: { increment: 1 } },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('API key auth error:', error);
    res.status(500).json({
      type: 'https://geckoadvisor.com/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
    });
  }
};
```

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
```typescript
// File: apps/backend/src/routes/auth.routes.ts
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@gecko-advisor/shared/db';

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(8),
});

router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = registerSchema.parse(req.body);

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({
        type: 'https://geckoadvisor.com/errors/user-exists',
        title: 'User Already Exists',
        status: 409,
        detail: 'An account with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        subscription: 'FREE',
        subscriptionStatus: 'ACTIVE', // Free tier is always active
      },
      select: {
        id: true,
        email: true,
        name: true,
        subscription: true,
      },
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        type: 'https://geckoadvisor.com/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        errors: error.errors,
      });
    }
    throw error;
  }
});
```

#### POST /api/auth/login
```typescript
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        subscription: true,
        subscriptionStatus: true,
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        type: 'https://geckoadvisor.com/errors/invalid-credentials',
        title: 'Invalid Credentials',
        status: 401,
        detail: 'Email or password is incorrect',
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({
        type: 'https://geckoadvisor.com/errors/invalid-credentials',
        title: 'Invalid Credentials',
        status: 401,
        detail: 'Email or password is incorrect',
      });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        type: 'https://geckoadvisor.com/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        errors: error.errors,
      });
    }
    throw error;
  }
});
```

### User Endpoints

#### GET /api/user/me
```typescript
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      subscription: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      apiKey: true,
      createdAt: true,
    },
  });

  res.json(user);
});
```

#### GET /api/user/scans
```typescript
router.get('/scans', requireAuth, async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [scans, total] = await Promise.all([
    prisma.scan.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        input: true,
        score: true,
        label: true,
        status: true,
        isPublic: true,
        isProScan: true,
        createdAt: true,
        finishedAt: true,
      },
    }),
    prisma.scan.count({
      where: { userId: req.user!.id },
    }),
  ]);

  res.json({
    scans,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
```

### Watched URL Endpoints

#### POST /api/watched-urls
```typescript
const createWatchedUrlSchema = z.object({
  url: z.string().url(),
  checkFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('WEEKLY'),
  alertOnChange: z.boolean().default(true),
});

router.post('/watched-urls', requirePro, async (req: AuthenticatedRequest, res) => {
  try {
    const data = createWatchedUrlSchema.parse(req.body);

    const watchedUrl = await prisma.watchedUrl.create({
      data: {
        userId: req.user!.id,
        url: data.url,
        checkFrequency: data.checkFrequency,
        alertOnChange: data.alertOnChange,
      },
    });

    res.status(201).json(watchedUrl);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        type: 'https://geckoadvisor.com/errors/already-watching',
        title: 'Already Watching URL',
        status: 409,
        detail: 'You are already watching this URL',
      });
    }
    throw error;
  }
});
```

#### GET /api/watched-urls
```typescript
router.get('/watched-urls', requirePro, async (req: AuthenticatedRequest, res) => {
  const watchedUrls = await prisma.watchedUrl.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ watchedUrls });
});
```

---

## Stripe Integration

### Webhook Handler

**File**: `apps/backend/src/routes/stripe.routes.ts`

```typescript
import Stripe from 'stripe';
import { prisma } from '@gecko-advisor/shared/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature']!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: subscription.customer as string },
  });

  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeSubscriptionId: subscription.id,
      subscription: 'PRO',
      subscriptionStatus: subscription.status.toUpperCase() as any,
      subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await prisma.user.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscription: 'FREE',
      subscriptionStatus: 'CANCELED',
      subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
    },
  });
}
```

---

## Environment Variables

Add to `.env`:
```bash
# JWT Authentication
JWT_SECRET=your-secure-random-secret-here-min-32-chars
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...

# Rate Limiting
FREE_TIER_DAILY_LIMIT=3
PRO_TIER_MONTHLY_LIMIT=10000
```

---

## Testing Strategy

### Unit Tests

**File**: `apps/backend/tests/auth.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@gecko-advisor/shared/db';
import bcrypt from 'bcryptjs';

describe('Authentication', () => {
  it('should register new user', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        subscription: 'FREE',
        subscriptionStatus: 'ACTIVE',
      },
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.subscription).toBe('FREE');
  });
});
```

### Integration Tests

Test rate limiting, subscription checks, and Pro features.

---

## Summary

This implementation provides:
- Complete authentication system with JWT
- Rate limiting for free users
- Stripe integration for subscriptions
- API key authentication for Pro users
- Watched URL monitoring for Pro users
- Proper error handling with RFC7807 format

Next steps:
1. Apply the migration
2. Implement the endpoints
3. Add frontend integration
4. Test thoroughly before production deployment
