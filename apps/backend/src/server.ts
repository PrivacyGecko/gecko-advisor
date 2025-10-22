import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import type { HttpLogger, Options as PinoHttpOptions } from "pino-http";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { requestId } from "./middleware/request-id.js";
import { withCsp } from "./middleware/csp.js";
import { scanRateLimit, reportRateLimit, generalRateLimit, statusRateLimit } from "./middleware/intelligent-rate-limit.js";
import { performanceMonitor, addPerformanceHeaders } from "./middleware/performance-monitor.js";
import { apiV1Router, apiV2Router } from "./routes/index.js";
import { adminRouter } from "./routes/admin.js";
import { docsRouter } from "./routes/docs.js";
import { authRouter } from "./routes/auth.js";
import { stripeRouter } from "./routes/stripe.js";
import { lemonsqueezyRouter } from "./routes/lemonsqueezy.js";
import { walletRouter } from "./routes/wallet.js";
// import { batchRouter } from "./routes/batch.js";
// import { apiRouter } from "./routes/api.js";
import { healthRouter } from "./health.js";
import { initSentry, Sentry } from "./sentry.js";
import { problem } from "./problem.js";

const allowedOrigins = config.allowedOrigins;
const createHttpLogger = pinoHttp as unknown as (options?: PinoHttpOptions) => HttpLogger;


export function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const sentryEnabled = initSentry();

  app.use(requestId);

  // Enable gzip/deflate compression for all responses
  // IMPORTANT: Must come BEFORE performance monitor to avoid res.end() conflicts
  // This significantly reduces payload size for large JSON responses (e.g., reports with 400+ evidence items)
  // Compression is applied to responses >= 1KB by default
  app.use(compression({
    level: 6, // Balanced compression (0-9, where 6 is default and recommended)
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress responses with 'Cache-Control: no-transform' directive
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression's default filter (text/html, application/json, etc.)
      return compression.filter(req, res);
    }
  }));

  // Add performance monitoring and headers (must come AFTER compression)
  app.use(addPerformanceHeaders);
  app.use(performanceMonitor);

  app.use(
    createHttpLogger({
      logger,
      autoLogging: {
        ignore: (req) => req.url?.startsWith('/healthz') ?? false,
      },
      genReqId: (_req, res) => (res as Response).locals.requestId ?? undefined,
      customProps: (_req, res) => ({
        requestId: (res as Response).locals.requestId,
      }),
    }) as unknown as express.RequestHandler
  );

  // Stripe webhook needs raw body for signature verification
  // Apply raw body parser BEFORE JSON parser for webhook endpoint
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req, _res, next) => {
    // Store raw body for signature verification
    (req as Request & { rawBody?: Buffer }).rawBody = req.body;
    next();
  });

  // LemonSqueezy webhook needs raw body for signature verification
  // Apply raw body parser BEFORE JSON parser for webhook endpoint
  app.use('/api/lemonsqueezy/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req, _res, next) => {
    // Store raw body for signature verification
    (req as Request & { rawBody?: Buffer }).rawBody = req.body;
    next();
  });

  app.use(express.json({ limit: '200kb' }));

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    withCsp({
      connectSources: config.csp.connectSources,
      imageSources: config.csp.imageSources,
      reportUri: config.cspReportUri,
    })
  );

  app.use(
    cors({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'X-Admin-Key',
        'X-Request-ID',
        'Authorization',
        'X-API-Key',
        'Stripe-Signature',
        'X-Signature', // LemonSqueezy webhook signature
      ],
      maxAge: 600,
      credentials: false,
      preflightContinue: false,
    })
  );

  app.use('/api', healthRouter);

  // Apply intelligent rate limiting to different endpoint groups
  // IMPORTANT: More specific routes must come BEFORE general routes in Express

  // Status endpoints need lenient rate limiting (lightweight read operations)
  app.use('/api/v1/scan/:id/status', statusRateLimit);
  app.use('/api/v1/scans/:id/status', statusRateLimit);
  app.use('/api/v2/scan/:id/status', statusRateLimit);
  app.use('/api/v2/scans/:id/status', statusRateLimit);
  app.use('/api/scan/:id/status', statusRateLimit);
  app.use('/api/scans/:id/status', statusRateLimit);

  // Scan submission endpoints have stricter limits
  // Apply limiter ONLY to POST requests to avoid throttling status polling
  const postOnly = (mw: express.RequestHandler): express.RequestHandler => (req, res, next) =>
    req.method === 'POST' ? mw(req, res, next) : next();

  app.use('/api/v1/scan', postOnly(scanRateLimit));
  app.use('/api/v1/scans', postOnly(scanRateLimit));
  app.use('/api/v2/scan', postOnly(scanRateLimit));
  app.use('/api/v2/scans', postOnly(scanRateLimit));
  app.use('/api/scan', postOnly(scanRateLimit));
  app.use('/api/scans', postOnly(scanRateLimit));

  // Report endpoints (read-heavy, moderate limits)
  app.use('/api/v1/report', reportRateLimit);
  app.use('/api/v1/reports', reportRateLimit);
  app.use('/api/v2/report', reportRateLimit);
  app.use('/api/v2/reports', reportRateLimit);
  app.use('/api/report', reportRateLimit);
  app.use('/api/reports', reportRateLimit);

  // General rate limiting for other endpoints (skip routes with specific rate limiting)
  app.use('/api', (req, res, next) => {
    // Skip general rate limit for routes that have their own specific rate limiting
    // NOTE: req.path has the mount point '/api' stripped, so we match without it
    const statusPathRegex = /^\/(v[12]\/)?scans?\/[^/]+\/status$/;
    if (statusPathRegex.test(req.path)) {
      return next();
    }
    return generalRateLimit(req, res, next);
  });

  app.use('/api/v1', apiV1Router);
  app.use('/api/v2', apiV2Router);
  app.use('/api', apiV2Router);

  // Pro tier feature routes
  // Stripe payment routes (requires STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID)
  app.use('/api/stripe', stripeRouter);

  // LemonSqueezy payment routes (global coverage, handles tax compliance)
  app.use('/api/lemonsqueezy', lemonsqueezyRouter);

  // app.use('/api/scan/batch', batchRouter);
  // app.use('/api/api-keys', apiRouter);

  // Other routes
  app.use('/api', adminRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/wallet', walletRouter);
  app.use('/docs', docsRouter);

  if (sentryEnabled) {
    Sentry.setupExpressErrorHandler(app);
  }

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    // Log the full error details securely (only in logs, not in response)
    logger.error({
      err,
      requestId: res.locals.requestId,
      method: req.method,
      url: req.url,
      ip: req.ip
    }, 'Unhandled error');

    // Never expose internal error details in response
    // The problem() function will handle sanitization based on environment
    if (err instanceof Error) {
      // Handle specific error types with appropriate status codes
      if (err.name === 'ValidationError') {
        return problem(res, 400, 'Bad Request', 'Invalid input data');
      }
      if (err.name === 'UnauthorizedError') {
        return problem(res, 401, 'Unauthorized');
      }
      if (err.name === 'ForbiddenError') {
        return problem(res, 403, 'Forbidden');
      }
      if (err.name === 'NotFoundError') {
        return problem(res, 404, 'Not Found');
      }
    }

    // Default to 500 for all other errors
    return problem(res, 500, 'Internal Server Error');
  });

  return app;
}







