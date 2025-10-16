import process from "node:process";

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is string => item.length > 0);
}

function isNonEmpty(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const appEnv = process.env.APP_ENV ?? nodeEnv;

const devOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const stageOrigin = process.env.STAGE_ORIGIN;
const apiOrigin = process.env.API_ORIGIN ?? process.env.BACKEND_PUBLIC_URL;
const workerOrigin = process.env.WORKER_PUBLIC_URL;
const allowOrigin = process.env.ALLOW_ORIGIN;
const extraOrigins = parseOrigins(process.env.CORS_EXTRA_ORIGINS);

const isLocalEnv = nodeEnv === 'development' || appEnv === 'development' || nodeEnv === 'test' || appEnv === 'test';

const rateLimitPerMinute = parseNumber(process.env.RATE_LIMIT_PER_MINUTE, 30);
const rateLimitScanPerMinute = parseNumber(process.env.RATE_LIMIT_SCAN_PER_MINUTE, rateLimitPerMinute);
const rateLimitReportPerMinute = parseNumber(process.env.RATE_LIMIT_REPORT_PER_MINUTE, rateLimitPerMinute * 4);
const cacheTtlMs = parseNumber(process.env.CACHE_TTL_MS, 15 * 60 * 1000);
const allowedOrigins = (() => {
  if (isLocalEnv) {
    return Array.from(new Set([...devOrigins, ...extraOrigins].filter(isNonEmpty)));
  }
  const primary = allowOrigin ?? stageOrigin;
  return Array.from(new Set([primary, ...extraOrigins].filter(isNonEmpty)));
})();


const logLevel = process.env.LOG_LEVEL ?? (nodeEnv === 'development' ? 'debug' : 'info');

const cspReportUri = process.env.CSP_REPORT_URI;

const connectSources = Array.from(
  new Set([
    "'self'",
    stageOrigin,
    apiOrigin,
    workerOrigin,
  ].filter(isNonEmpty))
);

const imageSources = ["'self'", 'data:'];

export const config = {
  nodeEnv,
  appEnv,
  port: parseNumber(process.env.BACKEND_PORT ?? process.env.PORT, 5000),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  sentryDsn: process.env.SENTRY_DSN_BE,
  sentryTracesSampleRate: Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.05'),
  allowedOrigins,
  rateLimitPerMinute,
  rateLimitScanPerMinute,
  rateLimitReportPerMinute,
  cacheTtlMs,
  logLevel,
  stageOrigin,
  apiOrigin,
  workerOrigin,
  cspReportUri,
  workerAttempts: parseNumber(process.env.WORKER_JOB_ATTEMPTS, 3),
  workerBackoffMs: parseNumber(process.env.WORKER_BACKOFF_MS, 5000),
  csp: {
    connectSources,
    imageSources,
  },
  // Payment Provider Configuration
  // NOTE: Stripe code is preserved but disabled via feature flag
  // LemonSqueezy integration is in progress
  payments: {
    stripe: {
      enabled: process.env.STRIPE_ENABLED === 'true',
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      priceId: process.env.STRIPE_PRICE_ID,
    },
    lemonsqueezy: {
      enabled: process.env.LEMONSQUEEZY_ENABLED === 'true',
      apiKey: process.env.LEMONSQUEEZY_API_KEY,
      storeId: process.env.LEMONSQUEEZY_STORE_ID,
      variantId: process.env.LEMONSQUEEZY_VARIANT_ID,
      webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
    },
    wallet: {
      enabled: process.env.WALLET_AUTH_ENABLED !== 'false', // Default true
      requiredTokens: parseNumber(process.env.WALLET_PRO_TOKEN_THRESHOLD, 10000),
    },
  },
};

export type AppConfig = typeof config;

export function isDev() {
  return config.nodeEnv === 'development';
}


