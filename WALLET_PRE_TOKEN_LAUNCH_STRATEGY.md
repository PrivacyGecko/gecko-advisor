# Wallet Integration: Pre-Token Launch Strategy

## Situation

- **Token Launch**: 2 weeks from now
- **Goal**: Build wallet infrastructure now, activate token gating when ready
- **Challenge**: No $PRICKO token mint address available yet

---

## Strategy: Phased Implementation

### Phase 1: Build Core Infrastructure (Now - Week 1)
**Goal**: Complete all wallet authentication without token balance checking

**What to Build**:
1. ✅ Database schema (WalletLink model)
2. ✅ Wallet signature verification (works without token)
3. ✅ Wallet authentication endpoints
4. ✅ Wallet linking to email accounts
5. ✅ Frontend wallet adapter integration
6. ✅ UI components (WalletButton, modals)
7. ✅ JWT with wallet support

**What NOT to Build Yet**:
- ❌ Token balance checking
- ❌ Automatic PRO upgrade via wallet

**Result**: Users can connect wallets and link to accounts, but no PRO access yet

---

### Phase 2: Mock Token Gating (Week 2)
**Goal**: Test complete flow with simulated token balance

**Mock Strategy Options**:

#### Option A: Whitelist Approach (Recommended)
```typescript
// apps/backend/src/services/solanaService.ts

const WHITELISTED_WALLETS = new Set([
  '7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q', // Test wallet 1
  'FqVHmPbkz8yMBVKrZdXQqWwCN4DyP8tKDhUGKEVNDMRg', // Test wallet 2
  // Add test wallets here
]);

export async function checkPrickoBalance(walletAddress: string): Promise<number> {
  // Before token launch: use whitelist
  if (WHITELISTED_WALLETS.has(walletAddress)) {
    return 10000; // Mock PRO-eligible balance
  }
  return 0; // Mock insufficient balance
}

export function isProEligible(balance: number): boolean {
  return balance >= 10000;
}
```

**Benefits**:
- Test complete PRO flow
- Control who gets access
- Easy to enable/disable

#### Option B: Environment Variable Toggle
```typescript
// apps/backend/src/services/solanaService.ts

export async function checkPrickoBalance(walletAddress: string): Promise<number> {
  const tokenLaunched = process.env.PRICKO_TOKEN_LAUNCHED === 'true';

  if (!tokenLaunched) {
    // Pre-launch: all wallets get mock balance for testing
    console.log('[MOCK] Token not launched yet, returning test balance');
    return 10000; // Mock PRO access for all wallets
  }

  // Post-launch: query real blockchain
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  // ... real balance checking code ...
}
```

**Benefits**:
- Single env variable to switch modes
- Easy testing for all developers
- No code changes needed at launch

---

### Phase 3: Token Launch Activation (Day of Launch)

**When Token Launches**:

1. **Get Token Mint Address**
   - Receive from token deployer
   - Format: `7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr`

2. **Update Environment Variables**
   ```bash
   # Add to Coolify stage/production
   PRICKO_TOKEN_MINT=<actual_token_mint_address>
   PRICKO_TOKEN_LAUNCHED=true  # Enable real balance checking
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   ```

3. **Deploy Updated Config**
   - No code changes needed!
   - Just redeploy with new env vars

4. **Verify**
   - Connect test wallet with real tokens
   - Verify balance shows correctly
   - Confirm PRO access granted

**Estimated Time**: 5 minutes to deploy

---

## Recommended Implementation Plan

### Week 1: Core Wallet Infrastructure

**Day 1-2: Backend Foundation**
- [x] Update Prisma schema with WalletLink model
- [x] Create migration
- [x] Implement wallet signature verification
- [x] Create wallet authentication routes
- [x] Add wallet linking endpoints
- [x] Implement mock balance checking (whitelist or env toggle)

**Day 3-4: Frontend Components**
- [x] Install @solana/wallet-adapter packages
- [x] Create WalletProvider
- [x] Build WalletButton component
- [x] Build WalletModal (connection)
- [x] Build LinkWalletModal
- [x] Update AuthContext with wallet state

**Day 5: Integration & Testing**
- [x] Update navigation with WalletButton
- [x] Test wallet connection flow
- [x] Test wallet linking to email accounts
- [x] Test with Phantom, Solflare, Backpack
- [x] Mobile responsive testing

### Week 2: Polish & Pre-Launch Testing

**Day 6-7: Mock Token Testing**
- [x] Add test wallets to whitelist
- [x] Test complete PRO access flow
- [x] Verify JWT includes wallet info
- [x] Test dual auth (email + wallet)

**Day 8-9: Stage Deployment**
- [x] Deploy to stage environment
- [x] Full E2E testing
- [x] Performance testing
- [x] Security audit

**Day 10: Production Prep**
- [x] Prepare deployment checklist
- [x] Document token activation process
- [x] Write deployment runbook
- [x] Ready for token launch

### Token Launch Day: Go Live

**Steps** (5-10 minutes):
1. Get $PRICKO token mint address
2. Add `PRICKO_TOKEN_MINT` to Coolify
3. Set `PRICKO_TOKEN_LAUNCHED=true`
4. Redeploy backend
5. Test with real tokens
6. Monitor balance queries
7. Announce to users!

---

## Mock Balance Implementation Code

### Backend Mock Service

```typescript
// apps/backend/src/services/solanaService.ts

import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../logger.js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const PRICKO_TOKEN_MINT = process.env.PRICKO_TOKEN_MINT;
const TOKEN_LAUNCHED = process.env.PRICKO_TOKEN_LAUNCHED === 'true';
const PRO_THRESHOLD = 10000;

// Whitelist for pre-launch testing
const WHITELISTED_WALLETS = new Set([
  '7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q', // Test wallet 1
  'FqVHmPbkz8yMBVKrZdXQqWwCN4DyP8tKDhUGKEVNDMRg', // Test wallet 2
]);

// In-memory cache (24hr TTL)
const balanceCache = new Map<string, { balance: number; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check $PRICKO token balance for a wallet
 * Pre-launch: Uses whitelist
 * Post-launch: Queries Solana blockchain
 */
export async function checkPrickoBalance(walletAddress: string): Promise<number> {
  // Check cache first
  const cached = balanceCache.get(walletAddress);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug({ walletAddress }, 'Returning cached balance');
    return cached.balance;
  }

  // PRE-LAUNCH MODE: Use whitelist
  if (!TOKEN_LAUNCHED) {
    logger.info({ walletAddress }, '[MOCK] Token not launched, checking whitelist');

    const balance = WHITELISTED_WALLETS.has(walletAddress) ? PRO_THRESHOLD : 0;

    // Cache mock balance
    balanceCache.set(walletAddress, { balance, timestamp: Date.now() });

    logger.info({ walletAddress, balance, mock: true }, 'Mock balance returned');
    return balance;
  }

  // POST-LAUNCH MODE: Query blockchain
  if (!PRICKO_TOKEN_MINT) {
    logger.error('PRICKO_TOKEN_MINT not configured');
    throw new Error('Token mint address not configured');
  }

  try {
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const walletPubkey = new PublicKey(walletAddress);
    const tokenMint = new PublicKey(PRICKO_TOKEN_MINT);

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPubkey,
      { mint: tokenMint }
    );

    let balance = 0;
    if (tokenAccounts.value.length > 0) {
      const amount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
      balance = parseFloat(amount.uiAmount);
    }

    // Cache result
    balanceCache.set(walletAddress, { balance, timestamp: Date.now() });

    logger.info({ walletAddress, balance, mock: false }, 'Real balance returned');
    return balance;

  } catch (error) {
    logger.error({ error, walletAddress }, 'Failed to check token balance');
    throw new Error('Failed to verify token balance');
  }
}

/**
 * Check if wallet balance qualifies for PRO access
 */
export function isProEligible(balance: number): boolean {
  return balance >= PRO_THRESHOLD;
}

/**
 * Add wallet to whitelist (for testing)
 */
export function addToWhitelist(walletAddress: string): void {
  WHITELISTED_WALLETS.add(walletAddress);
  logger.info({ walletAddress }, 'Wallet added to whitelist');
}
```

### Environment Variables

```bash
# .env (development)
PRICKO_TOKEN_LAUNCHED=false  # Use mock/whitelist mode
# PRICKO_TOKEN_MINT=          # Not set yet

# After token launch:
PRICKO_TOKEN_LAUNCHED=true   # Enable real balance checking
PRICKO_TOKEN_MINT=7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

---

## Benefits of This Approach

✅ **No Code Changes at Launch**
- Just update environment variables
- Redeploy takes 5 minutes
- No risk of breaking changes

✅ **Complete Testing Before Launch**
- Test entire wallet flow
- Test PRO access
- Test UI/UX
- Find bugs early

✅ **Flexible Development**
- Developers can test locally
- QA can test on stage
- No blockchain dependency

✅ **Safe Rollout**
- Start with whitelist of trusted users
- Gradually enable for all users
- Monitor performance and errors

---

## Decision Needed

**Which mock strategy do you prefer?**

### Option A: Whitelist Approach
- ✅ Precise control over who gets PRO
- ✅ Test with specific wallets
- ❌ Need to manage whitelist

### Option B: Environment Toggle (All or Nothing)
- ✅ Simple - one env variable
- ✅ Easy for developers to test
- ❌ All connected wallets get PRO during testing

**My Recommendation**: **Option B (Environment Toggle)**
- Simpler implementation
- Easier for developers
- Can switch to Option A later if needed

---

## Ready to Start?

Let me know:
1. **Which mock strategy?** (A or B)
2. **Any concerns about this approach?**
3. **Ready to start Phase 1?**

Once you decide, I'll begin implementing the wallet infrastructure! 🚀
