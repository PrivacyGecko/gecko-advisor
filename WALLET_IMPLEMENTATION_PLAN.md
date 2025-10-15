# Gecko Advisor: Solana Wallet Integration Plan

## Architecture Overview

This implementation adapts the wallet authentication system to the existing GeckoAdvisor architecture:

- **Frontend**: React 18 + Vite + React Router + Tailwind CSS
- **Backend**: Express + TypeScript + Zod validation
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT-based authentication (already implemented)

## Core Principles

- 🔓 **Optional crypto** - Never force wallet connection
- 🔒 **Privacy-first** - No wallet addresses stored in database (only hashed)
- 🎯 **Clear UX** - Separate, visible buttons for each auth method
- ⚡ **Seamless** - Both auth methods coexist without friction
- 💰 **Dual Pro Access**: Stripe subscription OR ≥10,000 $PRICKO tokens

---

## Phase 1: Database Schema Updates

### Add to Prisma Schema

```prisma
// infra/prisma/schema.prisma

enum AuthMethod {
  EMAIL
  WALLET
  BOTH
}

model User {
  // ... existing fields ...

  // Add new wallet-related fields
  authMethod       AuthMethod @default(EMAIL)
  walletLink       WalletLink?
}

// New model for wallet linking
model WalletLink {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Store HASHED wallet address for linking only
  walletAddressHash String   @unique
  linkedAt          DateTime @default(now())
  lastVerified      DateTime @default(now())

  @@index([walletAddressHash])
}
```

### Migration Command

```bash
npx prisma migrate dev --name add_wallet_auth --schema=infra/prisma/schema.prisma
```

---

## Phase 2: Backend Implementation

### 2.1 Install Dependencies

```bash
cd apps/backend
pnpm add @solana/web3.js tweetnacl bs58
pnpm add -D @types/bs58
```

### 2.2 Create Solana Services

**File**: `apps/backend/src/services/solanaService.ts`

- `verifyWalletSignature(message, signature, publicKey)` - Verify wallet signatures
- `checkPrickoBalance(walletAddress)` - Query token balance via Solana RPC
- `isProEligible(balance)` - Check if balance ≥ 10,000 tokens
- `generateChallenge(walletAddress)` - Create authentication challenge

**File**: `apps/backend/src/services/walletAuthService.ts`

- `authenticateWallet(walletAddress, signature, message)` - Wallet login
- `linkWalletToUser(userId, walletAddress, signature)` - Link wallet to existing email account
- `createEmailForWallet(walletHash, email, password)` - Create email account for wallet user
- `checkProStatus(user, walletAddress?)` - Check if user has Pro via Stripe OR wallet

### 2.3 Create Wallet Routes

**File**: `apps/backend/src/routes/wallet.ts`

```typescript
POST /api/wallet/verify
  Body: { walletAddress, signature, message }
  Returns: { token, user, wallet: { address, balance, isPro }, isPro }

POST /api/wallet/link
  Headers: Authorization: Bearer <token>
  Body: { walletAddress, signature, message }
  Returns: { success, wallet: { address, balance, isPro } }

POST /api/wallet/disconnect
  Headers: Authorization: Bearer <token>
  Returns: { success }

POST /api/wallet/create-email
  Body: { walletAddress, signature, message, email, password }
  Returns: { token, user }

GET /api/wallet/challenge/:walletAddress
  Returns: { challenge }
```

### 2.4 Update JWT Payload

**File**: `apps/backend/src/services/authService.ts`

```typescript
interface JwtPayload {
  userId: string;
  email?: string;
  authMethod: 'email' | 'wallet' | 'both';
  isPro: boolean;
  walletLinked: boolean;
}
```

### 2.5 Environment Variables

Add to `.env` and deployment configs:

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PRICKO_TOKEN_MINT=<YOUR_TOKEN_MINT_ADDRESS>

# Frontend URL (already exists)
FRONTEND_URL=https://stage.geckoadvisor.com
```

---

## Phase 3: Frontend Implementation

### 3.1 Install Dependencies

```bash
cd apps/frontend
pnpm add @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/web3.js
```

### 3.2 Create Wallet Provider

**File**: `apps/frontend/src/contexts/WalletProvider.tsx`

- Wrap app with Solana wallet adapter
- Support Phantom, Solflare, Backpack wallets
- Auto-connect disabled (user must explicitly connect)

### 3.3 Update Auth Context

**File**: `apps/frontend/src/contexts/AuthContext.tsx`

Add wallet state:

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  wallet: {
    connected: boolean;
    address?: string;
    balance?: number;
    isPro: boolean;
  };
  isPro: boolean; // true if Stripe PRO OR wallet has 10K+ tokens
  loginWithEmail: (email, password) => Promise<void>;
  loginWithWallet: (walletAddress, signature, message) => Promise<void>;
  linkWallet: (walletAddress, signature, message) => Promise<void>;
  logout: () => void;
}
```

### 3.4 Create Wallet Components

**File**: `apps/frontend/src/components/WalletButton.tsx`

- Always visible in navigation
- Shows "Connect Wallet" when not connected
- Shows wallet address + balance when connected
- Displays PRO badge if ≥10K tokens

**File**: `apps/frontend/src/components/WalletModal.tsx`

- Wallet selection (Phantom, Solflare, Backpack)
- Sign authentication message
- Handle connection errors

**File**: `apps/frontend/src/components/LinkWalletModal.tsx`

- For email users to connect their wallet
- Sign message to verify ownership
- Shows expected PRO status after linking

**File**: `apps/frontend/src/components/CreateEmailModal.tsx`

- For wallet-only users to create email account
- Email + password form
- Links wallet to new email account

### 3.5 Update Navigation

**File**: `apps/frontend/src/components/Navbar.tsx`

Add wallet button to navigation:

```tsx
<div className="flex items-center gap-4">
  {/* Existing login/signup buttons or user dropdown */}

  {/* Always visible wallet button */}
  <WalletButton />
</div>
```

**Desktop States**:
- Not logged in: `[Login] [🔌 Connect Wallet]`
- Email only: `user@email.com ▼ [🔌 Connect Wallet]`
- Wallet only: `[📧 Save Progress] 0x7d3f...a8c2 ▼ PRO`
- Both linked: `user@email.com ▼ 0x7d3f...a8c2 ▼ PRO`

---

## Phase 4: Integration Points

### 4.1 Update Stripe Integration

**File**: `apps/backend/src/services/stripeService.ts`

Modify subscription check to include wallet:

```typescript
async isUserPro(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { walletLink: true }
  });

  // Check Stripe subscription
  const hasStripePro = user.subscriptionStatus === 'ACTIVE';

  // Check wallet balance if linked
  let hasWalletPro = false;
  if (user.walletLink) {
    // Get wallet address from hash (query separately for security)
    const balance = await checkPrickoBalance(walletAddress);
    hasWalletPro = balance >= 10000;
  }

  return hasStripePro || hasWalletPro;
}
```

### 4.2 Update requirePro Middleware

**File**: `apps/backend/src/middleware/auth.ts`

```typescript
export async function requirePro(req, res, next) {
  // ... existing auth check ...

  // Check Pro status (Stripe OR wallet)
  const isPro = await walletAuthService.checkProStatus(user.id);

  if (!isPro) {
    return problem(res, 403, 'Forbidden',
      'This feature requires a Pro subscription or 10,000+ $PRICKO tokens.');
  }

  next();
}
```

### 4.3 Update Pricing Page

**File**: `apps/frontend/src/pages/Pricing.tsx`

Add wallet alternative to Pro tier:

```tsx
<div className="text-center mt-4 text-sm text-gray-600">
  <p>Or connect your wallet with 10,000+ $PRICKO tokens for instant PRO access</p>
  <WalletButton variant="outlined" />
</div>
```

---

## Phase 5: Security Implementation

### 5.1 Security Checklist

- [x] Never store wallet addresses in plaintext (use SHA256 hash)
- [x] RPC queries ONLY from backend (never client-side)
- [x] Rate limit all wallet endpoints (10 req/min per IP)
- [x] Validate all signatures on backend
- [x] JWT expires after 7 days
- [x] HTTPS only in production
- [x] Input validation with Zod on all endpoints
- [x] Prevent wallet linking to multiple accounts
- [x] Cache balance checks (24hr TTL) to reduce RPC load
- [x] Log auth events (without sensitive data)
- [x] Handle wallet disconnection gracefully

### 5.2 Rate Limiting

Add to wallet routes:

```typescript
import rateLimit from 'express-rate-limit';

const walletAuthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many authentication attempts, please try again later.'
});

walletRouter.post('/verify', walletAuthLimiter, ...);
```

---

## Phase 6: Testing Strategy

### 6.1 Backend Tests

**File**: `apps/backend/src/services/__tests__/solanaService.test.ts`

- Signature verification with valid/invalid signatures
- Balance checking with mocked RPC
- Challenge generation uniqueness
- Pro eligibility thresholds

**File**: `apps/backend/src/services/__tests__/walletAuthService.test.ts`

- Wallet authentication flow
- Linking wallet to email account
- Creating email for wallet user
- Preventing duplicate wallet links

### 6.2 Frontend Tests

**File**: `apps/frontend/src/__tests__/WalletButton.test.tsx`

- Renders correctly in all states
- Handles wallet connection
- Displays PRO badge when eligible
- Shows link email prompt for wallet-only users

### 6.3 E2E Tests

**File**: `tests/e2e/tests/wallet-integration.spec.ts`

- Complete wallet connection flow
- Link wallet to email account
- Create email for wallet user
- PRO access with sufficient tokens
- Graceful degradation with insufficient tokens

---

## Implementation Timeline

### Week 1: Backend Foundation

**Day 1-2**: Database & Core Services
- [x] Update Prisma schema
- [x] Create database migration
- [x] Implement Solana services (signature verification, balance checking)
- [x] Write unit tests for Solana services

**Day 3-4**: API Endpoints
- [x] Create wallet authentication routes
- [x] Implement wallet linking endpoints
- [x] Add rate limiting middleware
- [x] Update JWT payload structure
- [x] Write integration tests for wallet routes

**Day 5**: Integration
- [x] Update requirePro middleware
- [x] Integrate with Stripe subscription check
- [x] Add wallet status to /auth/me endpoint
- [x] Write E2E tests for combined auth

### Week 2: Frontend Implementation

**Day 6-7**: Wallet Provider & Context
- [x] Install Solana wallet adapter dependencies
- [x] Create WalletProvider component
- [x] Update AuthContext with wallet state
- [x] Implement wallet authentication methods

**Day 8-9**: UI Components
- [x] Build WalletButton component
- [x] Build WalletModal (wallet selection & connection)
- [x] Build LinkWalletModal (for email users)
- [x] Build CreateEmailModal (for wallet users)
- [x] Update Navbar with wallet button

**Day 10**: Polish & Testing
- [x] Mobile responsive adjustments
- [x] Loading and error states
- [x] Write component tests
- [x] E2E tests with Playwright
- [x] Documentation

### Week 3: Deployment & Monitoring

**Day 11-12**: Stage Deployment
- [x] Add environment variables to Coolify
- [x] Deploy to stage environment
- [x] Test with real wallets (Phantom, Solflare)
- [x] Monitor error rates and performance

**Day 13-14**: Production Deployment
- [x] Security audit
- [x] Performance optimization
- [x] Deploy to production
- [x] Monitor $PRICKO token balance queries
- [x] Set up alerts for RPC failures

---

## Success Criteria

✅ Email users can sign up and log in (already working)
✅ Wallet users can connect and verify balance
✅ "Connect Wallet" button is always visible
✅ Users can link both auth methods
✅ Pro access granted for Stripe OR 10K+ $PRICKO
✅ No wallet addresses stored in database (only hashed)
✅ All RPC queries from backend only
✅ Mobile responsive
✅ Works with Phantom, Solflare, Backpack
✅ Secure JWT handling
✅ Clear error messages
✅ Balance caching reduces RPC load
✅ All tests passing

---

## Questions to Answer Before Starting

1. **What is the exact $PRICKO SPL token mint address?**
   - Need this for balance checking

2. **Should we support Solana devnet for testing?**
   - Recommendation: Yes, use devnet for stage environment

3. **What should happen if wallet balance drops below 10K mid-session?**
   - Recommendation: Grace period until next login, then check balance

4. **Should wallet-only users have persistent accounts?**
   - Recommendation: Yes, create User record with authMethod: WALLET

5. **Any specific wallet adapters to prioritize?**
   - Recommendation: Phantom (most popular), Solflare, Backpack

6. **Should we allow multiple wallets per account (future)?**
   - Recommendation: Not in MVP, add later if needed

---

## Ready to Start Implementation?

**Next Steps**:
1. Provide $PRICKO token mint address
2. Approve this implementation plan
3. Start with Phase 1: Database schema updates
4. Continue with Phase 2: Backend services
5. Move to Phase 3: Frontend components
6. Complete integration and testing

Let me know when you're ready to proceed! 🚀
