import * as Sentry from "@sentry/node";
import { config } from "./config.js";
import { logger } from "./logger.js";

export function initSentry() {
  if (!config.sentryDsn) {
    logger.debug('Sentry DSN not configured; skipping init');
    return false;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.appEnv,
    release: process.env.GIT_SHA,
    tracesSampleRate: Number.isFinite(config.sentryTracesSampleRate)
      ? config.sentryTracesSampleRate
      : 0.05,
    integrations: [Sentry.expressIntegration()],
  });

  logger.info('Sentry initialized for backend');
  return true;
}

export { Sentry };