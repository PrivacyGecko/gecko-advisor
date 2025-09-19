import * as Sentry from "@sentry/node";
import { config } from "./config.js";
import { logger } from "./logger.js";

let enabled = false;

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

  enabled = true;
  logger.info('Sentry initialized for backend');
  return true;
}

export { Sentry };


