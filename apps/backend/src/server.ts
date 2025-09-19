import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import type { HttpLogger, Options as PinoHttpOptions } from "pino-http";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { requestId } from "./middleware/request-id.js";
import { withCsp } from "./middleware/csp.js";
import { apiV1Router, apiV2Router } from "./routes/index.js";
import { adminRouter } from "./routes/admin.js";
import { docsRouter } from "./routes/docs.js";
import { healthRouter } from "./health.js";
import { initSentry, Sentry } from "./sentry.js";
import { problem } from "./problem.js";

const allowedOrigins = config.allowedOrigins;
const createHttpLogger = pinoHttp as unknown as (options?: PinoHttpOptions) => HttpLogger;

const rateLimitHandler = (_req: Request, res: Response) => {
  res.setHeader('Retry-After', '60');
  return problem(res, 429, 'Too Many Requests', { retryAfterSeconds: 60 });
};

export function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const sentryEnabled = initSentry();

  app.use(requestId);

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
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Admin-Key', 'X-Request-ID'],
      maxAge: 600,
      credentials: false,
      preflightContinue: false,
    })
  );

  const scanLimiter = rateLimit({
    windowMs: 60_000,
    limit: config.rateLimitPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.ip ?? req.headers['x-forwarded-for']?.toString() ?? 'anonymous',
    handler: rateLimitHandler,
  });

  const reportLimiter = rateLimit({
    windowMs: 60_000,
    limit: config.rateLimitPerMinute * 4,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.ip ?? req.headers['x-forwarded-for']?.toString() ?? 'anonymous',
    handler: rateLimitHandler,
  });

  app.use('/api', healthRouter);

  app.use('/api/v1/scan', scanLimiter);
  app.use('/api/v2/scan', scanLimiter);
  app.use('/api/scan', scanLimiter);

  app.use('/api/v1/report', reportLimiter);
  app.use('/api/v1/reports', reportLimiter);
  app.use('/api/v2/report', reportLimiter);
  app.use('/api/v2/reports', reportLimiter);
  app.use('/api/report', reportLimiter);
  app.use('/api/reports', reportLimiter);

  app.use('/api/v1', apiV1Router);
  app.use('/api/v2', apiV2Router);
  app.use('/api', apiV2Router);

  app.use('/api', adminRouter);
  app.use('/api', docsRouter);

  if (sentryEnabled) {
    Sentry.setupExpressErrorHandler(app);
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'Unhandled error');
    return problem(res, 500, 'Internal Server Error');
  });

  return app;
}





