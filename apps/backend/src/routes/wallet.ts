import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { WalletAuthService } from '../services/walletAuthService.js';
import { SolanaService } from '../services/solanaService.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import type { SafeUser } from '../services/authService.js';

/**
 * Validation schema for wallet address parameter
 * Solana addresses are 32-44 characters of Base58 encoded data
 */
const WalletAddressParamSchema = z.object({
  walletAddress: z
    .string()
    .min(32, 'Invalid Solana wallet address')
    .max(44, 'Invalid Solana wallet address')
    .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid Solana wallet address format'),
});

/**
 * Validation schema for wallet verification
 * Solana addresses are 32-44 characters of Base58 encoded data
 */
const WalletVerifySchema = z.object({
  walletAddress: z
    .string()
    .min(32, 'Invalid Solana wallet address')
    .max(44, 'Invalid Solana wallet address')
    .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid Solana wallet address format'),
  signature: z.string().min(1, 'Signature is required'),
  message: z.string().min(1, 'Message is required'),
});

/**
 * Validation schema for wallet linking
 * Solana addresses are 32-44 characters of Base58 encoded data
 */
const WalletLinkSchema = z.object({
  walletAddress: z
    .string()
    .min(32, 'Invalid Solana wallet address')
    .max(44, 'Invalid Solana wallet address')
    .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid Solana wallet address format'),
  signature: z.string().min(1, 'Signature is required'),
  message: z.string().min(1, 'Message is required'),
});

/**
 * Rate limiter for wallet authentication endpoints
 * 10 requests per minute to prevent brute force attacks
 */
const walletLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many wallet authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (_req, res) => {
    return problem(
      res,
      429,
      'Too Many Requests',
      'Too many wallet authentication attempts, please try again later'
    );
  },
});

/**
 * Singleton instances of services
 */
const walletAuthService = new WalletAuthService(prisma);
const solanaService = new SolanaService();

export const walletRouter = Router();

/**
 * POST /api/wallet/challenge/:walletAddress
 * Generate authentication challenge for Solana wallet signature
 *
 * Path parameters:
 * - walletAddress: Solana wallet address (Base58 encoded, 32-44 characters)
 *
 * Response:
 * {
 *   "challenge": "Gecko Advisor - Wallet Authentication\n\nWallet: <address>\nTimestamp: ...\nNonce: ...\n\nThis request will not trigger a blockchain transaction or cost any gas fees."
 * }
 *
 * Error responses:
 * - 400: Invalid wallet address format
 * - 429: Too many requests
 * - 500: Server error
 */
walletRouter.post('/challenge/:walletAddress', walletLimiter, async (req, res) => {
  try {
    // Validate wallet address parameter
    const validation = WalletAddressParamSchema.safeParse(req.params);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      logger.debug({ error: validation.error }, 'Challenge generation validation failed');
      return problem(res, 400, 'Bad Request', firstError?.message ?? 'Invalid wallet address');
    }

    const { walletAddress } = validation.data;

    // Generate challenge using Solana service
    const challengeData = solanaService.generateChallenge(walletAddress);

    logger.info({ walletAddress }, 'Challenge generated for Solana wallet');

    return res.json({
      challenge: challengeData.message,
    });
  } catch (error) {
    logger.error({ error }, 'Challenge generation failed');
    return problem(res, 500, 'Internal Server Error', 'Failed to generate challenge');
  }
});

/**
 * POST /api/wallet/verify
 * Verify Solana wallet signature and authenticate user
 * Creates new user if wallet is not linked to any account
 * PRO eligibility determined by holding 10,000+ $PRICKO SPL tokens
 *
 * Request body:
 * {
 *   "walletAddress": "<Base58 encoded Solana address>",
 *   "signature": "<Base58 encoded signature>",
 *   "message": "Gecko Advisor - Wallet Authentication..."
 * }
 *
 * Response:
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "user": {
 *     "id": "cl...",
 *     "email": "...@wallet.geckoadvisor.com",
 *     "subscription": "FREE" | "PRO",
 *     ...
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid request data
 * - 401: Invalid signature
 * - 429: Too many requests
 * - 500: Server error
 */
walletRouter.post('/verify', walletLimiter, async (req, res) => {
  try {
    // Validate request body
    const validation = WalletVerifySchema.safeParse(req.body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      logger.debug({ error: validation.error }, 'Wallet verification validation failed');
      return problem(res, 400, 'Bad Request', firstError?.message ?? 'Invalid request data');
    }

    const { walletAddress, signature, message } = validation.data;

    // Authenticate Solana wallet using WalletAuthService
    const result = await walletAuthService.authenticateWallet(walletAddress, signature, message);

    logger.info({ userId: result.user.id, walletAddress }, 'Solana wallet authenticated successfully');

    return res.json({
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_SIGNATURE') {
        logger.info({ walletAddress: req.body.walletAddress }, 'Wallet verification failed: invalid signature');
        return problem(res, 401, 'Unauthorized', 'Invalid wallet signature');
      }
    }

    logger.error({ error }, 'Wallet verification failed');
    return problem(res, 500, 'Internal Server Error', 'Failed to verify wallet');
  }
});

/**
 * POST /api/wallet/link
 * Link Solana wallet to authenticated email user account
 * Enables wallet-based PRO eligibility via $PRICKO SPL token holdings
 * Requires JWT authentication
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Request body:
 * {
 *   "walletAddress": "<Base58 encoded Solana address>",
 *   "signature": "<Base58 encoded signature>",
 *   "message": "Gecko Advisor - Wallet Authentication..."
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "walletAddressHash": "sha256 hash",
 *   "isProEligible": true,
 *   "tokenBalance": 10000
 * }
 *
 * Error responses:
 * - 400: Invalid request data
 * - 401: Not authenticated or invalid signature
 * - 409: Wallet already linked to this or another account
 * - 429: Too many requests
 * - 500: Server error
 */
walletRouter.post('/link', requireAuth, walletLimiter, async (req, res) => {
  try {
    // Get authenticated user from middleware
    const user = (req as typeof req & { user?: SafeUser }).user;

    if (!user) {
      logger.error('User not found in request after requireAuth');
      return problem(res, 500, 'Internal Server Error', 'User not found');
    }

    // Validate request body
    const validation = WalletLinkSchema.safeParse(req.body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      logger.debug({ error: validation.error }, 'Wallet link validation failed');
      return problem(res, 400, 'Bad Request', firstError?.message ?? 'Invalid request data');
    }

    const { walletAddress, signature, message } = validation.data;

    // Link Solana wallet to user using WalletAuthService
    const result = await walletAuthService.linkWalletToUser(user.id, walletAddress, signature, message);

    logger.info({ userId: user.id, walletAddress }, 'Solana wallet linked successfully');

    return res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_SIGNATURE') {
        logger.info({ userId: (req as typeof req & { user?: SafeUser }).user?.id }, 'Wallet link failed: invalid signature');
        return problem(res, 401, 'Unauthorized', 'Invalid wallet signature');
      }
      if (error.message === 'WALLET_ALREADY_LINKED') {
        logger.info({ userId: (req as typeof req & { user?: SafeUser }).user?.id }, 'Wallet link failed: user already has wallet');
        return problem(
          res,
          409,
          'Conflict',
          'User already has a wallet linked'
        );
      }
      if (error.message === 'WALLET_LINKED_TO_ANOTHER_USER') {
        logger.info({ userId: (req as typeof req & { user?: SafeUser }).user?.id }, 'Wallet link failed: wallet linked to another user');
        return problem(
          res,
          409,
          'Conflict',
          'This wallet is already linked to another account'
        );
      }
    }

    logger.error({ error }, 'Wallet link failed');
    return problem(res, 500, 'Internal Server Error', 'Failed to link wallet');
  }
});

/**
 * POST /api/wallet/disconnect
 * Remove Solana wallet link from authenticated user account
 * Will downgrade user from PRO if wallet was the source of PRO eligibility
 * Requires JWT authentication
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Response:
 * {
 *   "success": true
 * }
 *
 * Error responses:
 * - 401: Not authenticated
 * - 404: No wallet linked
 * - 500: Server error
 */
walletRouter.post('/disconnect', requireAuth, async (req, res) => {
  try {
    // Get authenticated user from middleware
    const user = (req as typeof req & { user?: SafeUser }).user;

    if (!user) {
      logger.error('User not found in request after requireAuth');
      return problem(res, 500, 'Internal Server Error', 'User not found');
    }

    // Disconnect Solana wallet using WalletAuthService
    await walletAuthService.unlinkWallet(user.id);

    logger.info({ userId: user.id }, 'Solana wallet disconnected successfully');

    return res.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_WALLET_LINKED') {
      logger.info({ userId: (req as typeof req & { user?: SafeUser }).user?.id }, 'Wallet disconnect failed: no wallet linked');
      return problem(res, 404, 'Not Found', 'No wallet linked to this account');
    }

    logger.error({ error }, 'Wallet disconnect failed');
    return problem(res, 500, 'Internal Server Error', 'Failed to disconnect wallet');
  }
});

/**
 * GET /api/wallet/status
 * Get Solana wallet connection status for authenticated user
 * Returns whether a wallet is linked (does not expose actual wallet address for privacy)
 * Requires JWT authentication
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Response if connected:
 * {
 *   "connected": true
 * }
 *
 * Response if not connected:
 * {
 *   "connected": false
 * }
 *
 * Error responses:
 * - 401: Not authenticated
 * - 500: Server error
 */
walletRouter.get('/status', requireAuth, async (req, res) => {
  try {
    // Get authenticated user from middleware
    const user = (req as typeof req & { user?: SafeUser }).user;

    if (!user) {
      logger.error('User not found in request after requireAuth');
      return problem(res, 500, 'Internal Server Error', 'User not found');
    }

    // Check if user has wallet link (privacy-preserving)
    const userWithWallet = await prisma.user.findUnique({
      where: { id: user.id },
      include: { walletLink: true },
    });

    if (!userWithWallet) {
      logger.error({ userId: user.id }, 'User not found in database');
      return problem(res, 500, 'Internal Server Error', 'User not found');
    }

    const connected = !!userWithWallet.walletLink;

    logger.debug({ userId: user.id, connected }, 'Wallet status retrieved');

    return res.json({ connected });
  } catch (error) {
    logger.error({ error }, 'Failed to get wallet status');
    return problem(res, 500, 'Internal Server Error', 'Failed to get wallet status');
  }
});
