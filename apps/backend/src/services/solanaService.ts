import { Connection, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { logger } from '../logger.js';

const PRO_ELIGIBLE_BALANCE = 10000;
const BALANCE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Cached balance entry
 */
interface CachedBalance {
  balance: number;
  timestamp: number;
}

/**
 * Challenge generation result
 */
export interface ChallengeMessage {
  message: string;
  timestamp: number;
  nonce: string;
}

/**
 * SolanaService handles all Solana blockchain interactions including:
 * - Wallet signature verification using tweetnacl
 * - Authentication challenge generation
 * - PRICKO token balance checking (mock or real based on launch status)
 * - PRO eligibility determination based on token holdings
 */
export class SolanaService {
  private connection: Connection;
  private balanceCache: Map<string, CachedBalance>;
  private tokenLaunched: boolean;
  private tokenMint: string | null;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.balanceCache = new Map();
    this.tokenLaunched = process.env.PRICKO_TOKEN_LAUNCHED === 'true';
    this.tokenMint = process.env.PRICKO_TOKEN_MINT || null;

    logger.info(
      {
        rpcUrl,
        tokenLaunched: this.tokenLaunched,
        hasTokenMint: !!this.tokenMint,
      },
      'SolanaService initialized'
    );
  }

  /**
   * Verify Solana wallet signature using tweetnacl
   * This validates that the signature was created by the private key corresponding to the public key
   *
   * @param message - Original message that was signed
   * @param signature - Base58 encoded signature
   * @param publicKey - Base58 encoded public key (wallet address)
   * @returns True if signature is valid, false otherwise
   */
  verifyWalletSignature(message: string, signature: string, publicKey: string): boolean {
    try {
      logger.debug(
        {
          publicKey,
          messageLength: message.length,
          signatureLength: signature.length,
        },
        'Verifying wallet signature'
      );

      // Decode the signature and public key from base58
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(publicKey);

      // Convert message to Uint8Array
      const messageBytes = new TextEncoder().encode(message);

      // Verify the signature using tweetnacl
      const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

      logger.info(
        {
          publicKey,
          isValid,
        },
        'Wallet signature verification result'
      );

      return isValid;
    } catch (error) {
      logger.error(
        {
          error,
          publicKey,
        },
        'Failed to verify wallet signature'
      );
      return false;
    }
  }

  /**
   * Generate authentication challenge message for wallet signing
   * Includes timestamp and nonce for replay attack prevention
   *
   * @param walletAddress - Solana wallet address
   * @returns Challenge object with message, timestamp, and nonce
   */
  generateChallenge(walletAddress: string): ChallengeMessage {
    const timestamp = Date.now();
    const nonce = this.generateNonce();

    const message = [
      'Gecko Advisor - Wallet Authentication',
      '',
      `Wallet: ${walletAddress}`,
      `Timestamp: ${timestamp}`,
      `Nonce: ${nonce}`,
      '',
      'This request will not trigger a blockchain transaction or cost any gas fees.',
    ].join('\n');

    logger.debug(
      {
        walletAddress,
        timestamp,
        nonce,
      },
      'Generated authentication challenge'
    );

    return {
      message,
      timestamp,
      nonce,
    };
  }

  /**
   * Check PRICKO token balance for a wallet address
   * Uses mock balance (10000) before token launch
   * Queries Solana RPC for actual balance after token launch
   * Implements 24-hour caching to reduce RPC calls
   *
   * @param walletAddress - Solana wallet address
   * @returns Token balance (10000 if pre-launch, actual balance if launched)
   * @throws Error if wallet address is invalid or RPC call fails
   */
  async checkPrickoBalance(walletAddress: string): Promise<number> {
    logger.info(
      {
        walletAddress,
        tokenLaunched: this.tokenLaunched,
      },
      'Checking PRICKO token balance'
    );

    // Pre-launch: return mock PRO-eligible balance
    if (!this.tokenLaunched) {
      logger.info(
        {
          walletAddress,
          balance: PRO_ELIGIBLE_BALANCE,
        },
        'Returning mock balance (token not launched)'
      );
      return PRO_ELIGIBLE_BALANCE;
    }

    // Check cache first
    const cached = this.balanceCache.get(walletAddress);
    if (cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL_MS) {
      logger.debug(
        {
          walletAddress,
          balance: cached.balance,
          cacheAge: Date.now() - cached.timestamp,
        },
        'Returning cached balance'
      );
      return cached.balance;
    }

    // Post-launch: query actual balance from Solana
    try {
      if (!this.tokenMint) {
        logger.error('PRICKO_TOKEN_MINT not configured but token is marked as launched');
        throw new Error('PRICKO_TOKEN_MINT_NOT_CONFIGURED');
      }

      // Validate wallet address
      const publicKey = new PublicKey(walletAddress);

      // Get token account for this wallet and token mint
      const tokenMintPublicKey = new PublicKey(this.tokenMint);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: tokenMintPublicKey,
      });

      let balance = 0;

      // Sum up all token account balances (usually just one)
      for (const tokenAccount of tokenAccounts.value) {
        const accountData = tokenAccount.account.data;
        if ('parsed' in accountData) {
          const amount = accountData.parsed.info.tokenAmount.uiAmount;
          balance += amount;
        }
      }

      logger.info(
        {
          walletAddress,
          balance,
          tokenAccounts: tokenAccounts.value.length,
        },
        'Retrieved actual token balance from Solana'
      );

      // Cache the balance
      this.balanceCache.set(walletAddress, {
        balance,
        timestamp: Date.now(),
      });

      return balance;
    } catch (error) {
      logger.error(
        {
          error,
          walletAddress,
        },
        'Failed to check PRICKO token balance'
      );
      throw new Error('BALANCE_CHECK_FAILED');
    }
  }

  /**
   * Determine if a token balance qualifies for PRO tier
   *
   * @param balance - Token balance
   * @returns True if balance >= 10,000 PRICKO tokens
   */
  isProEligible(balance: number): boolean {
    return balance >= PRO_ELIGIBLE_BALANCE;
  }

  /**
   * Get the minimum balance required for PRO tier
   *
   * @returns Minimum PRICKO token balance for PRO eligibility
   */
  getProEligibleBalance(): number {
    return PRO_ELIGIBLE_BALANCE;
  }

  /**
   * Clear balance cache for a specific wallet or entire cache
   *
   * @param walletAddress - Optional wallet address to clear (clears all if not provided)
   */
  clearBalanceCache(walletAddress?: string): void {
    if (walletAddress) {
      this.balanceCache.delete(walletAddress);
      logger.debug({ walletAddress }, 'Cleared balance cache for wallet');
    } else {
      this.balanceCache.clear();
      logger.debug('Cleared entire balance cache');
    }
  }

  /**
   * Generate a cryptographically secure nonce
   *
   * @returns Random nonce string
   */
  private generateNonce(): string {
    const bytes = nacl.randomBytes(16);
    return bs58.encode(bytes);
  }

  /**
   * Validate that a challenge message has not expired (within 5 minutes)
   *
   * @param timestamp - Challenge timestamp
   * @returns True if challenge is still valid
   */
  validateChallengeTimestamp(timestamp: number): boolean {
    const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
    const age = Date.now() - timestamp;
    return age >= 0 && age <= MAX_AGE_MS;
  }
}
