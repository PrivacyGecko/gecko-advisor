import { Router } from 'express';
import { z } from 'zod';
import { AuthService, type SafeUser } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';

/**
 * Validation schema for email-only account creation
 */
const EmailOnlySchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Validation schema for full registration
 */
const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

/**
 * Validation schema for login
 */
const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string(),
});

/**
 * Validation schema for forgot password
 */
const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Validation schema for resetting password
 */
const ResetPasswordSchema = z.object({
  token: z.string().min(16, 'Invalid reset token'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Singleton instance of AuthService
 */
const authService = new AuthService(prisma);

export const authRouter = Router();

/**
 * POST /api/auth/create-account
 * Create email-only account without password
 * Returns JWT token for authentication
 *
 * Request body:
 * {
 *   "email": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "user": {
 *     "id": "cl...",
 *     "email": "user@example.com",
 *     "subscription": "FREE",
 *     ...
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid email format
 * - 409: Email already exists
 * - 500: Server error
 */
authRouter.post('/create-account', async (req, res) => {
  try {
    // Validate request body
    const validation = EmailOnlySchema.safeParse(req.body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      logger.debug({ error: validation.error }, 'Create account validation failed');
      return problem(res, 400, 'Bad Request', firstError?.message ?? 'Invalid request data');
    }

    const { email } = validation.data;

    // Create email-only account
    const result = await authService.createEmailOnlyAccount(email);

    logger.info({ userId: result.user.id, email }, 'Email-only account created');

    return res.status(201).json({
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'EMAIL_EXISTS') {
        logger.info({ email: req.body.email }, 'Create account failed: email exists');
        return problem(res, 409, 'Conflict', 'An account with this email already exists');
      }
    }

    logger.error({ error }, 'Create account failed');
    return problem(res, 500, 'Internal Server Error', 'Failed to create account');
  }
});

/**
 * POST /api/auth/register
 * Register new user with email and password
 * Returns JWT token for authentication
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepassword123",
 *   "name": "John Doe" // optional
 * }
 *
 * Response:
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "user": {
 *     "id": "cl...",
 *     "email": "user@example.com",
 *     "name": "John Doe",
 *     "subscription": "FREE",
 *     ...
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid email/password format
 * - 409: Email already exists
 * - 500: Server error
 */
authRouter.post('/register', async (req, res) => {
  try {
    // Validate request body
    const validation = RegisterSchema.safeParse(req.body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      logger.debug({ error: validation.error }, 'Registration validation failed');
      return problem(res, 400, 'Bad Request', firstError?.message ?? 'Invalid request data');
    }

    const { email, password, name } = validation.data;

    // Register user
    const result = await authService.register(email, password, name);

    logger.info({ userId: result.user.id, email }, 'User registered');

    return res.status(201).json({
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'EMAIL_EXISTS') {
        logger.info({ email: req.body.email }, 'Registration failed: email exists');
        return problem(res, 409, 'Conflict', 'An account with this email already exists');
      }
      if (error.message === 'PASSWORD_TOO_SHORT') {
        return problem(res, 400, 'Bad Request', 'Password must be at least 8 characters');
      }
    }

    logger.error({ error }, 'Registration failed');
    return problem(res, 500, 'Internal Server Error', 'Failed to register user');
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 * Returns JWT token for authentication
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepassword123"
 * }
 *
 * Response:
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "user": {
 *     "id": "cl...",
 *     "email": "user@example.com",
 *     "name": "John Doe",
 *     "subscription": "FREE",
 *     ...
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid email/password format
 * - 401: Invalid credentials
 * - 500: Server error
 */
authRouter.post('/login', async (req, res) => {
  try {
    // Validate request body
    const validation = LoginSchema.safeParse(req.body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      logger.debug({ error: validation.error }, 'Login validation failed');
      return problem(res, 400, 'Bad Request', firstError?.message ?? 'Invalid request data');
    }

    const { email, password } = validation.data;

    // Login user
    const result = await authService.login(email, password);

    logger.info({ userId: result.user.id, email }, 'User logged in');

    return res.json({
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_CREDENTIALS') {
        logger.info({ email: req.body.email }, 'Login failed: invalid credentials');
        return problem(res, 401, 'Unauthorized', 'Invalid email or password');
      }
    }

    logger.error({ error }, 'Login failed');
    return problem(res, 500, 'Internal Server Error', 'Failed to login');
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiate password reset flow
 *
 * Request body:
 * { "email": "user@example.com" }
 *
 * Response: 200 even if email is not registered
 */
authRouter.post('/forgot-password', async (req, res) => {
  const validation = ForgotPasswordSchema.safeParse(req.body);
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    logger.debug({ error: validation.error }, 'Forgot password validation failed');
    return problem(res, 400, 'Bad Request', firstError?.message ?? 'Invalid request data');
  }

  const { email } = validation.data;

  try {
    await authService.requestPasswordReset(email);
  } catch (error) {
    logger.error({ error, email }, 'Forgot password request failed');
    // Intentionally continue to return generic success response
  }

  return res.json({
    message: 'If an account exists for that email, a reset link has been sent.',
  });
});

/**
 * POST /api/auth/reset-password
 * Complete password reset with token
 *
 * Request body:
 * { "token": "reset-token", "password": "newpassword" }
 *
 * Response:
 * { token, user }
 */
authRouter.post('/reset-password', async (req, res) => {
  const validation = ResetPasswordSchema.safeParse(req.body);

  if (!validation.success) {
    const firstError = validation.error.errors[0];
    logger.debug({ error: validation.error }, 'Reset password validation failed');
    return problem(res, 400, 'Bad Request', firstError?.message ?? 'Invalid request data');
  }

  const { token, password } = validation.data;

  try {
    const result = await authService.resetPassword(token, password);
    return res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PASSWORD_TOO_SHORT') {
        return problem(res, 400, 'Bad Request', 'Password must be at least 8 characters');
      }
      if (error.message === 'RESET_TOKEN_INVALID') {
        return problem(res, 400, 'Bad Request', 'Reset link is invalid or has already been used');
      }
      if (error.message === 'RESET_TOKEN_EXPIRED') {
        return problem(res, 400, 'Bad Request', 'Reset link has expired. Please request a new one.');
      }
    }

    logger.error({ error }, 'Reset password failed');
    return problem(res, 500, 'Internal Server Error', 'Failed to reset password');
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 * Requires authentication
 *
 * Headers:
 * Authorization: Bearer <token>
 *
 * Response:
 * {
 *   "user": {
 *     "id": "cl...",
 *     "email": "user@example.com",
 *     "name": "John Doe",
 *     "subscription": "FREE",
 *     "subscriptionStatus": "INACTIVE",
 *     "apiKey": null,
 *     "createdAt": "2024-01-01T00:00:00.000Z",
 *     "updatedAt": "2024-01-01T00:00:00.000Z"
 *   }
 * }
 *
 * Error responses:
 * - 401: Invalid or missing token
 * - 500: Server error
 */
authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    // User is already attached by requireAuth middleware
    // Type assertion needed because Express type augmentation may not be picked up
    const user = (req as typeof req & { user?: SafeUser }).user;

    if (!user) {
      // This should never happen if requireAuth middleware works correctly
      logger.error('User not found in request after requireAuth');
      return problem(res, 500, 'Internal Server Error', 'User not found');
    }

    logger.debug({ userId: user.id }, 'User profile retrieved');

    return res.json({
      user,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get user profile');
    return problem(res, 500, 'Internal Server Error', 'Failed to get user profile');
  }
});
