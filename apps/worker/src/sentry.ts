import * as Sentry from "@sentry/node";
import { config } from "./config.js";
import { logger } from "./logger.js";

let enabled = false;

export function initSentry() {
  if (!config.sentryDsn) {
    logger.debug('Worker Sentry DSN not configured; skipping init');
    return false;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.GIT_SHA,
    tracesSampleRate: Number.isFinite(config.sentryTracesSampleRate)
      ? config.sentryTracesSampleRate
      : 0.05,
  });

  enabled = true;
  logger.info('Sentry initialized for worker');
  return true;
}

export { Sentry };
