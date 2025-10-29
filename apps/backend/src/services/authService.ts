// SPDX-License-Identifier: MIT
import type { PrismaClient, User } from '@prisma/client';
import { AuthMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import crypto from 'node:crypto';
import { logger } from '../logger.js';

const SALT_ROUNDS = 10;
const JWT_EXPIRATION = '7d';
const API_KEY_PREFIX = 'pa_';
const API_KEY_LENGTH = 32;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_EXPIRATION_MINUTES = 60;

/**
 * JWT payload structure
 */
interface JwtPayload {
  userId: string;
}

/**
 * User response without sensitive fields
 */
export interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  authMethod: string;
  subscription: string;
  subscriptionStatus: string;
  subscriptionEndsAt: Date | null;
  apiKey: string | null;
  apiCallsMonth: number;
  apiResetAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Authentication result with token and user
 */
export interface AuthResult {
  user: SafeUser;
  token: string;
}

/**
 * AuthService handles all authentication operations including:
 * - Email-only account creation (no password)
 * - Full registration with password
 * - Login with credentials
 * - JWT token generation and verification
 * - API key generation for Pro users
 */
export class AuthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Removes sensitive fields from user object
   */
  private sanitizeUser(user: User): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, emailVerified, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Create SHA-256 hash for password reset token comparison
   */
  private hashResetToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create email-only account (no password required)
   * Used for users who want to save scan history without full registration
   *
   * @param email User's email address
   * @returns Authentication result with user and token
   * @throws Error if email already exists
   */
  async createEmailOnlyAccount(email: string): Promise<AuthResult> {
    logger.info({ email }, 'Creating email-only account');

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      logger.warn({ email }, 'Email already exists');
      throw new Error('EMAIL_EXISTS');
    }

    // Create user without password
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: null, // No password for email-only accounts
        subscription: 'FREE',
        subscriptionStatus: 'INACTIVE',
      },
    });

    logger.info({ userId: user.id, email }, 'Email-only account created successfully');

    const token = this.generateToken(user.id);
    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * Full registration with email, password, and optional name
   * Creates a new user account with secure password hashing
   *
   * @param email User's email address
   * @param password User's password (will be hashed)
   * @param name Optional user name
   * @returns Authentication result with user and token
   * @throws Error if email already exists or password is invalid
   */
  async register(email: string, password: string, name?: string): Promise<AuthResult> {
    logger.info({ email, hasName: !!name }, 'Registering new user');

    // Validate password length
    if (password.length < 8) {
      throw new Error('PASSWORD_TOO_SHORT');
    }

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      logger.warn({ email }, 'Email already exists during registration');
      throw new Error('EMAIL_EXISTS');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user with password
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name?.trim() || null,
        passwordHash,
        subscription: 'FREE',
        subscriptionStatus: 'INACTIVE',
      },
    });

    logger.info({ userId: user.id, email }, 'User registered successfully');

    const token = this.generateToken(user.id);
    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * Login with email and password
   * Validates credentials and returns authentication token
   *
   * @param email User's email address
   * @param password User's password
   * @returns Authentication result with user and token
   * @throws Error if credentials are invalid
   */
  async login(email: string, password: string): Promise<AuthResult> {
    logger.info({ email }, 'User login attempt');

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      logger.warn({ email }, 'Login failed: user not found');
      throw new Error('INVALID_CREDENTIALS');
    }

    // Check if user has a password (email-only accounts cannot login)
    if (!user.passwordHash) {
      logger.warn({ email, userId: user.id }, 'Login failed: email-only account');
      throw new Error('INVALID_CREDENTIALS');
    }

    // Verify password using constant-time comparison
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      logger.warn({ email, userId: user.id }, 'Login failed: invalid password');
      throw new Error('INVALID_CREDENTIALS');
    }

    logger.info({ userId: user.id, email }, 'User logged in successfully');

    const token = this.generateToken(user.id);
    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * Request a password reset and send email with SendGrid
   *
   * @param email User email address
   */
  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      logger.info({ email: normalizedEmail }, 'Password reset requested for non-existent email');
      return;
    }

    const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRATION_MINUTES * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    // Email service removed for 100% free open source release
    // Password reset tokens are generated but emails are not sent
    // Future implementations can add their own email service here
    logger.warn(
      { userId: user.id, email: user.email },
      'Password reset token generated but email service is not configured'
    );
  }

  /**
   * Reset password using token
   *
   * @param token Reset token provided in email
   * @param newPassword New password
   * @returns Authentication result for the user
   */
  async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
    if (newPassword.length < 8) {
      throw new Error('PASSWORD_TOO_SHORT');
    }

    const tokenHash = this.hashResetToken(token);
    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord || resetRecord.usedAt) {
      throw new Error('RESET_TOKEN_INVALID');
    }

    if (resetRecord.expiresAt.getTime() < Date.now()) {
      throw new Error('RESET_TOKEN_EXPIRED');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: resetRecord.userId },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const nextAuthMethod =
        user.authMethod === AuthMethod.WALLET
          ? AuthMethod.BOTH
          : user.authMethod;

      const savedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          authMethod: nextAuthMethod,
        },
      });

      const now = new Date();

      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: now },
      });

      await tx.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null,
          id: { not: resetRecord.id },
        },
      });

      return savedUser;
    });

    logger.info({ userId: updatedUser.id }, 'Password reset successfully');

    const jwtToken = this.generateToken(updatedUser.id);

    return {
      user: this.sanitizeUser(updatedUser),
      token: jwtToken,
    };
  }

  /**
   * Generate JWT token for user authentication
   * Token expires in 7 days
   *
   * @param userId User's unique identifier
   * @returns JWT token string
   */
  generateToken(userId: string): string {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable not set');
      throw new Error('JWT_SECRET_NOT_CONFIGURED');
    }

    const payload: JwtPayload = { userId };
    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: JWT_EXPIRATION,
    });

    logger.debug({ userId }, 'JWT token generated');
    return token;
  }

  /**
   * Verify JWT token and extract user ID
   *
   * @param token JWT token string
   * @returns Decoded payload with userId
   * @throws Error if token is invalid or expired
   */
  verifyToken(token: string): JwtPayload {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable not set');
      throw new Error('JWT_SECRET_NOT_CONFIGURED');
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Token expired');
        throw new Error('TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        logger.debug('Invalid token');
        throw new Error('INVALID_TOKEN');
      }
      logger.error({ error }, 'Token verification failed');
      throw new Error('TOKEN_VERIFICATION_FAILED');
    }
  }

  /**
   * Generate API key for Pro users
   * API keys are used for programmatic access to the Gecko Advisor API
   * Format: pa_[32 random alphanumeric characters]
   *
   * @param userId User's unique identifier
   * @returns Generated API key string
   * @throws Error if user not found or not Pro tier
   */
  async generateApiKey(userId: string): Promise<string> {
    logger.info({ userId }, 'Generating API key');

    // Verify user exists and is Pro tier
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.warn({ userId }, 'User not found for API key generation');
      throw new Error('USER_NOT_FOUND');
    }

    if (user.subscription !== 'PRO' && user.subscription !== 'TEAM') {
      logger.warn({ userId, subscription: user.subscription }, 'User not eligible for API key');
      throw new Error('NOT_PRO_USER');
    }

    // Generate unique API key
    const apiKey = `${API_KEY_PREFIX}${nanoid(API_KEY_LENGTH)}`;

    // Update user with new API key
    await this.prisma.user.update({
      where: { id: userId },
      data: { apiKey },
    });

    logger.info({ userId }, 'API key generated successfully');
    return apiKey;
  }

  /**
   * Get user by ID
   *
   * @param userId User's unique identifier
   * @returns User object without sensitive fields
   * @throws Error if user not found
   */
  async getUserById(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Verify API key and get associated user
   *
   * @param apiKey API key to verify
   * @returns User object without sensitive fields
   * @throws Error if API key is invalid
   */
  async verifyApiKey(apiKey: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { apiKey },
    });

    if (!user) {
      throw new Error('INVALID_API_KEY');
    }

    return this.sanitizeUser(user);
  }
}
