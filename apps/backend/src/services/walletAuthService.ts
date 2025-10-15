import type { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import { logger } from '../logger.js';
import { SolanaService } from './solanaService.js';
import type { AuthResult, SafeUser } from './authService.js';

/**
 * Wallet link result
 */
export interface WalletLinkResult {
  success: boolean;
  walletAddressHash: string;
  isProEligible: boolean;
  tokenBalance: number;
}

/**
 * PRO status check result
 */
export interface ProStatusResult {
  isPro: boolean;
  source: 'stripe' | 'wallet' | 'none';
  expiresAt?: Date;
  tokenBalance?: number;
}

/**
 * WalletAuthService handles Solana wallet-based authentication including:
 * - Wallet signature verification for authentication
 * - Linking wallets to existing user accounts
 * - PRO tier determination based on token holdings or Stripe subscription
 * - Managing wallet-based authentication flow
 */
export class WalletAuthService {
  private solanaService: SolanaService;

  constructor(
    private prisma: PrismaClient,
    solanaService?: SolanaService
  ) {
    this.solanaService = solanaService || new SolanaService();
  }

  /**
   * Authenticate user via Solana wallet signature
   * Verifies signature, checks token balance, and creates/finds user account
   * Generates JWT token for subsequent API requests
   *
   * @param walletAddress - Solana wallet public key
   * @param signature - Base58 encoded signature of the challenge message
   * @param message - Original challenge message that was signed
   * @returns Authentication result with user info and JWT token
   * @throws Error if signature is invalid or wallet address is malformed
   */
  async authenticateWallet(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<AuthResult> {
    logger.info({ walletAddress }, 'Authenticating wallet');

    // Verify the signature
    const isValidSignature = this.solanaService.verifyWalletSignature(
      message,
      signature,
      walletAddress
    );

    if (!isValidSignature) {
      logger.warn({ walletAddress }, 'Invalid wallet signature');
      throw new Error('INVALID_SIGNATURE');
    }

    // Hash the wallet address for database storage
    const walletAddressHash = this.hashWalletAddress(walletAddress);

    // Check token balance
    let tokenBalance = 0;
    let isProEligible = false;
    try {
      tokenBalance = await this.solanaService.checkPrickoBalance(walletAddress);
      isProEligible = this.solanaService.isProEligible(tokenBalance);
    } catch (error) {
      logger.error({ error, walletAddress }, 'Failed to check token balance during authentication');
      // Continue without PRO eligibility - user can still authenticate
    }

    logger.info(
      {
        walletAddress,
        walletAddressHash,
        tokenBalance,
        isProEligible,
      },
      'Wallet signature verified, checking for existing wallet link'
    );

    // Check if wallet is already linked to a user
    const existingWalletLink = await this.prisma.walletLink.findUnique({
      where: { walletAddressHash },
      include: { user: true },
    });

    let user;

    if (existingWalletLink) {
      // User exists with this wallet
      user = existingWalletLink.user;

      // Update lastVerified timestamp
      await this.prisma.walletLink.update({
        where: { id: existingWalletLink.id },
        data: { lastVerified: new Date() },
      });

      logger.info(
        {
          userId: user.id,
          walletAddressHash,
        },
        'Found existing user with wallet link'
      );
    } else {
      // Create new user with wallet authentication
      // Use hashed wallet address as email identifier
      const email = `${walletAddressHash.substring(0, 16)}@wallet.geckoadvisor.com`;

      user = await this.prisma.user.create({
        data: {
          email,
          name: `Wallet ${walletAddress.substring(0, 8)}`,
          passwordHash: null, // No password for wallet-only accounts
          authMethod: 'WALLET',
          subscription: isProEligible ? 'PRO' : 'FREE',
          subscriptionStatus: isProEligible ? 'ACTIVE' : 'INACTIVE',
          walletLink: {
            create: {
              walletAddressHash,
              linkedAt: new Date(),
              lastVerified: new Date(),
            },
          },
        },
      });

      logger.info(
        {
          userId: user.id,
          email,
          walletAddressHash,
          subscription: user.subscription,
        },
        'Created new user with wallet authentication'
      );
    }

    // Update subscription based on current token balance
    if (isProEligible && user.subscription !== 'PRO' && user.authMethod !== 'EMAIL') {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          subscription: 'PRO',
          subscriptionStatus: 'ACTIVE',
        },
      });
      logger.info(
        {
          userId: user.id,
          tokenBalance,
        },
        'Upgraded user to PRO based on token balance'
      );
    }

    // Generate JWT token (we'll need to import AuthService for this)
    const { AuthService } = await import('./authService.js');
    const authService = new AuthService(this.prisma);
    const token = authService.generateToken(user.id);

    // Sanitize user object
    const safeUser = this.sanitizeUser(user);

    logger.info(
      {
        userId: user.id,
        walletAddressHash,
        subscription: user.subscription,
      },
      'Wallet authentication successful'
    );

    return {
      user: safeUser,
      token,
    };
  }

  /**
   * Link a Solana wallet to an existing authenticated user account
   * Allows users to add wallet authentication to email-based accounts
   *
   * @param userId - User ID from authenticated session
   * @param walletAddress - Solana wallet public key to link
   * @param signature - Base58 encoded signature of the challenge message
   * @param message - Original challenge message that was signed
   * @returns Wallet link result with PRO eligibility status
   * @throws Error if wallet already linked to another user or signature invalid
   */
  async linkWalletToUser(
    userId: string,
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<WalletLinkResult> {
    logger.info({ userId, walletAddress }, 'Linking wallet to user');

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { walletLink: true },
    });

    if (!user) {
      logger.warn({ userId }, 'User not found for wallet linking');
      throw new Error('USER_NOT_FOUND');
    }

    if (user.walletLink) {
      logger.warn({ userId, existingWallet: user.walletLink.walletAddressHash }, 'User already has wallet linked');
      throw new Error('WALLET_ALREADY_LINKED');
    }

    // Verify the signature
    const isValidSignature = this.solanaService.verifyWalletSignature(
      message,
      signature,
      walletAddress
    );

    if (!isValidSignature) {
      logger.warn({ userId, walletAddress }, 'Invalid wallet signature for linking');
      throw new Error('INVALID_SIGNATURE');
    }

    // Hash the wallet address
    const walletAddressHash = this.hashWalletAddress(walletAddress);

    // Check if wallet is already linked to another user
    const existingWalletLink = await this.prisma.walletLink.findUnique({
      where: { walletAddressHash },
    });

    if (existingWalletLink) {
      logger.warn(
        {
          userId,
          walletAddressHash,
          existingUserId: existingWalletLink.userId,
        },
        'Wallet already linked to another user'
      );
      throw new Error('WALLET_LINKED_TO_ANOTHER_USER');
    }

    // Check token balance
    let tokenBalance = 0;
    let isProEligible = false;
    try {
      tokenBalance = await this.solanaService.checkPrickoBalance(walletAddress);
      isProEligible = this.solanaService.isProEligible(tokenBalance);
    } catch (error) {
      logger.error({ error, userId, walletAddress }, 'Failed to check token balance during linking');
      // Continue without PRO eligibility
    }

    // Create wallet link
    await this.prisma.walletLink.create({
      data: {
        userId,
        walletAddressHash,
        linkedAt: new Date(),
        lastVerified: new Date(),
      },
    });

    // Update user authMethod to BOTH if they have email auth
    if (user.passwordHash) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { authMethod: 'BOTH' },
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: { authMethod: 'WALLET' },
      });
    }

    logger.info(
      {
        userId,
        walletAddressHash,
        tokenBalance,
        isProEligible,
      },
      'Wallet linked to user successfully'
    );

    return {
      success: true,
      walletAddressHash,
      isProEligible,
      tokenBalance,
    };
  }

  /**
   * Check if user has PRO status from either Stripe subscription or token holdings
   * Implements OR logic: user is PRO if EITHER condition is met
   *
   * @param userId - User ID to check
   * @returns PRO status result with source and details
   * @throws Error if user not found
   */
  async checkProStatus(userId: string): Promise<ProStatusResult> {
    logger.debug({ userId }, 'Checking PRO status');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { walletLink: true },
    });

    if (!user) {
      logger.warn({ userId }, 'User not found for PRO status check');
      throw new Error('USER_NOT_FOUND');
    }

    // Check Stripe subscription first
    if (
      user.subscription === 'PRO' &&
      user.subscriptionStatus === 'ACTIVE' &&
      user.stripeSubscriptionId
    ) {
      logger.info(
        {
          userId,
          source: 'stripe',
          expiresAt: user.subscriptionEndsAt,
        },
        'User has active Stripe PRO subscription'
      );

      return {
        isPro: true,
        source: 'stripe',
        expiresAt: user.subscriptionEndsAt || undefined,
      };
    }

    // Check wallet token balance
    if (user.walletLink) {
      try {
        // We need to get the actual wallet address to check balance
        // Since we only store the hash, we need to pass the actual address from the client
        // For now, we'll check if user has PRO subscription set
        // In production, you'd need to store or retrieve the actual wallet address securely

        logger.info(
          {
            userId,
            hasWalletLink: true,
            currentSubscription: user.subscription,
          },
          'User has wallet link, subscription status used as proxy'
        );

        // If user has wallet link and PRO subscription without Stripe, it's from tokens
        if (user.subscription === 'PRO' && !user.stripeSubscriptionId) {
          return {
            isPro: true,
            source: 'wallet',
          };
        }
      } catch (error) {
        logger.error({ error, userId }, 'Failed to check wallet balance for PRO status');
      }
    }

    logger.debug({ userId }, 'User does not have PRO status');

    return {
      isPro: false,
      source: 'none',
    };
  }

  /**
   * Refresh wallet-based PRO status by checking current token balance
   * Should be called periodically or when user requests status update
   *
   * @param userId - User ID to refresh
   * @param walletAddress - Actual wallet address (needed to check balance)
   * @returns Updated PRO status
   * @throws Error if user not found or wallet not linked
   */
  async refreshWalletProStatus(userId: string, walletAddress: string): Promise<ProStatusResult> {
    logger.info({ userId, walletAddress }, 'Refreshing wallet PRO status');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { walletLink: true },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (!user.walletLink) {
      throw new Error('WALLET_NOT_LINKED');
    }

    // Verify the wallet address matches the linked wallet
    const walletAddressHash = this.hashWalletAddress(walletAddress);
    if (walletAddressHash !== user.walletLink.walletAddressHash) {
      logger.warn({ userId, providedHash: walletAddressHash, storedHash: user.walletLink.walletAddressHash }, 'Wallet address mismatch');
      throw new Error('WALLET_ADDRESS_MISMATCH');
    }

    // Clear cache and check fresh balance
    this.solanaService.clearBalanceCache(walletAddress);
    const tokenBalance = await this.solanaService.checkPrickoBalance(walletAddress);
    const isProEligible = this.solanaService.isProEligible(tokenBalance);

    logger.info(
      {
        userId,
        tokenBalance,
        isProEligible,
        currentSubscription: user.subscription,
      },
      'Refreshed wallet balance'
    );

    // Update user subscription if wallet provides PRO and no active Stripe subscription
    if (isProEligible && !user.stripeSubscriptionId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscription: 'PRO',
          subscriptionStatus: 'ACTIVE',
        },
      });
      logger.info({ userId, tokenBalance }, 'Updated user to PRO based on token balance');
    } else if (!isProEligible && !user.stripeSubscriptionId && user.subscription === 'PRO') {
      // Downgrade if token balance dropped and no Stripe subscription
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscription: 'FREE',
          subscriptionStatus: 'INACTIVE',
        },
      });
      logger.info({ userId, tokenBalance }, 'Downgraded user from PRO due to insufficient token balance');
    }

    return {
      isPro: isProEligible,
      source: 'wallet',
      tokenBalance,
    };
  }

  /**
   * Unlink wallet from user account
   *
   * @param userId - User ID to unlink wallet from
   * @throws Error if user not found or no wallet linked
   */
  async unlinkWallet(userId: string): Promise<void> {
    logger.info({ userId }, 'Unlinking wallet from user');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { walletLink: true },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (!user.walletLink) {
      throw new Error('NO_WALLET_LINKED');
    }

    // Delete wallet link
    await this.prisma.walletLink.delete({
      where: { id: user.walletLink.id },
    });

    // Update authMethod
    const newAuthMethod = user.passwordHash ? 'EMAIL' : 'EMAIL'; // Keep EMAIL even if no password for now
    await this.prisma.user.update({
      where: { id: userId },
      data: { authMethod: newAuthMethod },
    });

    // Downgrade from PRO if no Stripe subscription
    if (user.subscription === 'PRO' && !user.stripeSubscriptionId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscription: 'FREE',
          subscriptionStatus: 'INACTIVE',
        },
      });
      logger.info({ userId }, 'Downgraded user from PRO after wallet unlink');
    }

    logger.info({ userId }, 'Wallet unlinked successfully');
  }

  /**
   * Hash wallet address using SHA-256
   * We hash wallet addresses for privacy and to prevent linking across services
   *
   * @param walletAddress - Solana wallet public key
   * @returns SHA-256 hash of the wallet address
   */
  private hashWalletAddress(walletAddress: string): string {
    return crypto.createHash('sha256').update(walletAddress.toLowerCase()).digest('hex');
  }

  /**
   * Removes sensitive fields from user object
   * Matches the pattern from AuthService
   */
  private sanitizeUser(user: {
    id: string;
    email: string;
    name: string | null;
    passwordHash: string | null;
    emailVerified: boolean;
    authMethod: string;
    subscription: string;
    subscriptionStatus: string;
    subscriptionEndsAt: Date | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    apiKey: string | null;
    apiCallsMonth: number;
    apiResetAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, emailVerified, stripeSubscriptionId, ...safeUser } = user;
    return safeUser;
  }
}
