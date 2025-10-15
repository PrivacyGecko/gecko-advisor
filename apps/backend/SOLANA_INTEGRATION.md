# Solana Wallet Integration - Backend Services

This document describes the backend services implemented for Solana wallet authentication and PRO tier eligibility via PRICKO token holdings.

## Overview

The Solana integration provides:
- **Wallet-based authentication** using signature verification
- **PRO tier eligibility** based on PRICKO token balance (≥10,000 tokens)
- **Hybrid authentication** allowing users to link wallets to email accounts
- **Mock mode** for pre-launch testing (returns 10,000 PRICKO for all wallets)

## Architecture

### Services

#### 1. SolanaService (`src/services/solanaService.ts`)

Low-level Solana blockchain interactions.

**Key Features:**
- Signature verification using tweetnacl
- Challenge message generation for secure authentication
- Token balance checking with 24-hour cache
- Mock balance mode controlled by `PRICKO_TOKEN_LAUNCHED` env var

**Public Methods:**

```typescript
// Verify wallet signature
verifyWalletSignature(message: string, signature: string, publicKey: string): boolean

// Generate authentication challenge
generateChallenge(walletAddress: string): ChallengeMessage

// Check token balance (mock or real)
checkPrickoBalance(walletAddress: string): Promise<number>

// Check PRO eligibility
isProEligible(balance: number): boolean

// Clear balance cache
clearBalanceCache(walletAddress?: string): void

// Validate challenge timestamp (5 minute expiry)
validateChallengeTimestamp(timestamp: number): boolean
```

#### 2. WalletAuthService (`src/services/walletAuthService.ts`)

High-level wallet authentication and account management.

**Key Features:**
- Wallet authentication with automatic user creation
- Wallet linking to existing accounts
- PRO status checking (Stripe OR wallet)
- Wallet unlinking with subscription downgrade

**Public Methods:**

```typescript
// Authenticate via wallet (create/login)
authenticateWallet(
  walletAddress: string,
  signature: string,
  message: string
): Promise<AuthResult>

// Link wallet to existing user
linkWalletToUser(
  userId: string,
  walletAddress: string,
  signature: string,
  message: string
): Promise<WalletLinkResult>

// Check PRO status (Stripe OR wallet)
checkProStatus(userId: string): Promise<ProStatusResult>

// Refresh wallet PRO status
refreshWalletProStatus(
  userId: string,
  walletAddress: string
): Promise<ProStatusResult>

// Unlink wallet
unlinkWallet(userId: string): Promise<void>
```

## Environment Configuration

### Required Variables

Add to your `.env` file:

```bash
# Solana RPC endpoint
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Token mint address (set after launch)
PRICKO_TOKEN_MINT=

# Launch status (false = mock mode, true = real balance checking)
PRICKO_TOKEN_LAUNCHED=false
```

### Pre-Launch Mode

When `PRICKO_TOKEN_LAUNCHED=false`:
- All wallet addresses return 10,000 PRICKO (mock balance)
- Users authenticate and get PRO tier immediately
- No actual blockchain queries are made
- Perfect for frontend development and testing

### Post-Launch Mode

When `PRICKO_TOKEN_LAUNCHED=true`:
- Real token balances are queried from Solana RPC
- `PRICKO_TOKEN_MINT` must be set to the actual token mint address
- Balances are cached for 24 hours per wallet
- Users need ≥10,000 PRICKO tokens for PRO tier

## Database Schema

The integration uses the existing `User` model and adds a new `WalletLink` model:

```prisma
model User {
  // ... existing fields
  authMethod      AuthMethod @default(EMAIL)  // EMAIL, WALLET, or BOTH
  walletLink      WalletLink?
}

model WalletLink {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id])
  walletAddressHash String   @unique  // SHA-256 hash for privacy
  linkedAt          DateTime @default(now())
  lastVerified      DateTime @default(now())
}
```

**Privacy Note:** Wallet addresses are hashed using SHA-256 before storage to prevent cross-service tracking.

## Usage Examples

### Example 1: Wallet Authentication Flow

```typescript
import { WalletAuthService } from './services/walletAuthService.js';
import { SolanaService } from './services/solanaService.js';
import { prisma } from './prisma.js';

const walletAuthService = new WalletAuthService(prisma);
const solanaService = new SolanaService();

// 1. Generate challenge for user to sign
const challenge = solanaService.generateChallenge(walletAddress);
// Send challenge.message to frontend for signing

// 2. User signs message in wallet (frontend)
// const signature = await wallet.signMessage(challenge.message);

// 3. Verify and authenticate
try {
  const authResult = await walletAuthService.authenticateWallet(
    walletAddress,
    signature,
    challenge.message
  );

  // User is authenticated, token balance checked, PRO status set
  console.log('User:', authResult.user);
  console.log('JWT Token:', authResult.token);
  console.log('PRO Status:', authResult.user.subscription);
} catch (error) {
  if (error.message === 'INVALID_SIGNATURE') {
    // Handle invalid signature
  }
}
```

### Example 2: Link Wallet to Existing User

```typescript
// User is already authenticated via email
const userId = req.user.userId; // From JWT

// 1. Generate challenge
const challenge = solanaService.generateChallenge(walletAddress);

// 2. User signs in wallet (frontend)

// 3. Link wallet
try {
  const linkResult = await walletAuthService.linkWalletToUser(
    userId,
    walletAddress,
    signature,
    challenge.message
  );

  console.log('Wallet linked:', linkResult.success);
  console.log('PRO eligible:', linkResult.isProEligible);
  console.log('Token balance:', linkResult.tokenBalance);
} catch (error) {
  if (error.message === 'WALLET_ALREADY_LINKED') {
    // User already has a wallet linked
  } else if (error.message === 'WALLET_LINKED_TO_ANOTHER_USER') {
    // This wallet is linked to a different account
  }
}
```

### Example 3: Check PRO Status (Hybrid)

```typescript
// Check if user has PRO via Stripe OR wallet
const proStatus = await walletAuthService.checkProStatus(userId);

if (proStatus.isPro) {
  console.log(`User has PRO via ${proStatus.source}`);
  // source can be 'stripe', 'wallet', or 'none'

  if (proStatus.source === 'stripe') {
    console.log('Expires:', proStatus.expiresAt);
  } else if (proStatus.source === 'wallet') {
    console.log('Token balance:', proStatus.tokenBalance);
  }
} else {
  console.log('User is on FREE tier');
}
```

### Example 4: Refresh Wallet Balance

```typescript
// Force refresh of token balance (bypasses 24hr cache)
const freshStatus = await walletAuthService.refreshWalletProStatus(
  userId,
  walletAddress  // Actual wallet address needed
);

console.log('Fresh balance:', freshStatus.tokenBalance);
console.log('PRO eligible:', freshStatus.isPro);

// User subscription is automatically updated in database
```

### Example 5: Unlink Wallet

```typescript
// Remove wallet link from user account
await walletAuthService.unlinkWallet(userId);

// User is downgraded from PRO if they don't have Stripe subscription
// authMethod is updated from BOTH to EMAIL
```

## API Integration

You'll typically create these endpoints:

### POST /api/auth/wallet/challenge

Generate challenge for wallet to sign:

```typescript
router.post('/auth/wallet/challenge', async (req, res) => {
  const { walletAddress } = req.body;

  const solanaService = new SolanaService();
  const challenge = solanaService.generateChallenge(walletAddress);

  res.json({ challenge: challenge.message, timestamp: challenge.timestamp });
});
```

### POST /api/auth/wallet/verify

Authenticate with signed challenge:

```typescript
router.post('/auth/wallet/verify', async (req, res) => {
  const { walletAddress, signature, message } = req.body;

  const walletAuthService = new WalletAuthService(prisma);

  try {
    const authResult = await walletAuthService.authenticateWallet(
      walletAddress,
      signature,
      message
    );

    res.json({
      token: authResult.token,
      user: authResult.user
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});
```

### POST /api/auth/wallet/link

Link wallet to authenticated user:

```typescript
router.post('/auth/wallet/link', authenticateJWT, async (req, res) => {
  const { walletAddress, signature, message } = req.body;
  const userId = req.user.userId;

  const walletAuthService = new WalletAuthService(prisma);

  try {
    const linkResult = await walletAuthService.linkWalletToUser(
      userId,
      walletAddress,
      signature,
      message
    );

    res.json(linkResult);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### GET /api/user/pro-status

Check PRO status:

```typescript
router.get('/user/pro-status', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;

  const walletAuthService = new WalletAuthService(prisma);
  const proStatus = await walletAuthService.checkProStatus(userId);

  res.json(proStatus);
});
```

## Security Considerations

### Wallet Address Privacy

- Wallet addresses are **hashed (SHA-256)** before database storage
- Original addresses are never stored in the database
- This prevents cross-service tracking and maintains privacy

### Signature Verification

- Uses industry-standard **tweetnacl** for Ed25519 signature verification
- Challenge messages include **timestamp and nonce** to prevent replay attacks
- Challenges expire after **5 minutes**

### Balance Caching

- Balances are cached for **24 hours** to reduce RPC load
- Cache can be cleared manually via `clearBalanceCache()`
- Use `refreshWalletProStatus()` to force fresh balance check

### Authentication Flow

1. Backend generates unique challenge with timestamp + nonce
2. Frontend sends challenge to wallet for signing
3. User approves signature in wallet (no gas fees)
4. Backend verifies signature cryptographically
5. Backend checks token balance and sets PRO status
6. JWT token issued for subsequent API calls

## PRO Tier Logic

Users have PRO tier if **EITHER** condition is true:

1. **Stripe subscription:** `subscription === 'PRO' && subscriptionStatus === 'ACTIVE'`
2. **Token holdings:** Wallet linked AND balance ≥ 10,000 PRICKO

This OR logic allows flexibility:
- Users can pay via Stripe
- Users can hold tokens instead
- Users can have both (redundant but allowed)

## Error Handling

All services throw errors with descriptive codes:

### SolanaService Errors
- `BALANCE_CHECK_FAILED` - RPC query failed
- `PRICKO_TOKEN_MINT_NOT_CONFIGURED` - Token mint not set when launched

### WalletAuthService Errors
- `INVALID_SIGNATURE` - Signature verification failed
- `USER_NOT_FOUND` - User ID doesn't exist
- `WALLET_ALREADY_LINKED` - User already has a wallet
- `WALLET_LINKED_TO_ANOTHER_USER` - Wallet used by different account
- `WALLET_NOT_LINKED` - No wallet to unlink
- `WALLET_ADDRESS_MISMATCH` - Provided address doesn't match stored hash
- `NO_WALLET_LINKED` - Attempting operation requiring wallet link

## Testing

### Pre-Launch Testing (Recommended)

Set `PRICKO_TOKEN_LAUNCHED=false` in your `.env`:

```bash
PRICKO_TOKEN_LAUNCHED=false
```

All wallets return 10,000 PRICKO tokens, allowing full PRO feature testing without blockchain interaction.

### Unit Tests

```typescript
import { SolanaService } from './services/solanaService';

describe('SolanaService', () => {
  it('should return mock balance when token not launched', async () => {
    process.env.PRICKO_TOKEN_LAUNCHED = 'false';
    const service = new SolanaService();

    const balance = await service.checkPrickoBalance('any-wallet-address');
    expect(balance).toBe(10000);
  });

  it('should determine PRO eligibility correctly', () => {
    const service = new SolanaService();

    expect(service.isProEligible(10000)).toBe(true);
    expect(service.isProEligible(9999)).toBe(false);
    expect(service.isProEligible(15000)).toBe(true);
  });
});
```

## Performance

### RPC Optimization
- 24-hour balance cache reduces Solana RPC calls
- Recommended RPC endpoints:
  - **Free:** `https://api.mainnet-beta.solana.com` (rate limited)
  - **Paid:** QuickNode, Helius, or Alchemy (higher rate limits)

### Database Optimization
- `walletAddressHash` is indexed for fast lookups
- `WalletLink` uses 1:1 relationship with `User`
- Consider adding compound index if querying by multiple fields

## Production Deployment

### Pre-Launch Checklist
- [ ] Set `PRICKO_TOKEN_LAUNCHED=false`
- [ ] Deploy backend services
- [ ] Test wallet authentication flow
- [ ] Verify PRO tier activation works
- [ ] Test wallet linking to email accounts

### Launch Checklist
- [ ] Set `PRICKO_TOKEN_MINT=<actual-mint-address>`
- [ ] Set `PRICKO_TOKEN_LAUNCHED=true`
- [ ] Deploy updated configuration
- [ ] Monitor RPC rate limits
- [ ] Test with real token balances

### Post-Launch Monitoring
- Monitor `BALANCE_CHECK_FAILED` errors in logs
- Track RPC endpoint performance
- Monitor cache hit rates
- Watch for `WALLET_LINKED_TO_ANOTHER_USER` errors (potential abuse)

## Dependencies

### Installed Packages

```json
{
  "dependencies": {
    "@solana/web3.js": "^1.98.4",
    "tweetnacl": "^1.0.3",
    "bs58": "^6.0.0"
  },
  "devDependencies": {
    "@types/bs58": "^5.0.0"
  }
}
```

### Installation

```bash
cd apps/backend
pnpm add @solana/web3.js tweetnacl bs58
pnpm add -D @types/bs58
```

## Logging

All services use the existing `pino` logger with structured logging:

```typescript
logger.info(
  {
    walletAddress,
    tokenBalance,
    isProEligible,
  },
  'Wallet signature verified, checking for existing wallet link'
);
```

Log levels:
- `debug` - Challenge generation, cache hits
- `info` - Authentication success, PRO upgrades/downgrades
- `warn` - Invalid signatures, duplicate wallet attempts
- `error` - RPC failures, unexpected errors

## Future Enhancements

Potential improvements for future iterations:

1. **Multi-wallet support** - Allow users to link multiple wallets
2. **NFT-based PRO** - Support NFT ownership as PRO qualification
3. **Token staking** - Require tokens to be staked, not just held
4. **Grace period** - Allow temporary PRO after balance drops below threshold
5. **Webhook notifications** - Alert users when balance changes affect PRO status
6. **Analytics** - Track wallet vs Stripe PRO distribution

---

## Support

For questions or issues:
- Check logs for detailed error messages
- Ensure environment variables are set correctly
- Verify Solana RPC endpoint is accessible
- Confirm wallet addresses are valid Solana public keys

**Pre-Launch:** All wallets work with mock balances.
**Post-Launch:** Ensure `PRICKO_TOKEN_MINT` is set to the correct address.
