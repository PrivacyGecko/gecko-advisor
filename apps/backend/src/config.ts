import process from "node:process";

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
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
const frontendOrigin = process.env.FRONTEND_PUBLIC_URL ?? stageOrigin ?? allowOrigin;
const extraOrigins = parseOrigins(process.env.CORS_EXTRA_ORIGINS);

const isLocalEnv = nodeEnv === 'development' || appEnv === 'development' || nodeEnv === 'test' || appEnv === 'test';

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

const objectStorageEnabled = parseBoolean(process.env.OBJECT_STORAGE_ENABLED, false);
const objectStorageConfiguration = {
  enabled: objectStorageEnabled,
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
  region: process.env.OBJECT_STORAGE_REGION ?? 'us-east-1',
  forcePathStyle: parseBoolean(process.env.OBJECT_STORAGE_FORCE_PATH_STYLE, true),
  accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY,
  secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY,
  bucket: process.env.OBJECT_STORAGE_BUCKET,
  publicUrl: process.env.OBJECT_STORAGE_PUBLIC_URL,
  reportPrefix: process.env.OBJECT_STORAGE_REPORT_PREFIX ?? 'reports/',
  signedUrlExpirySeconds: parseNumber(process.env.OBJECT_STORAGE_SIGNED_URL_SECONDS, 3600),
};

const turnstileEnabled = parseBoolean(process.env.TURNSTILE_ENABLED, false);
const turnstileConfiguration = {
  enabled: turnstileEnabled && Boolean(process.env.TURNSTILE_SECRET_KEY),
  siteKey: process.env.TURNSTILE_SITE_KEY,
  secretKey: process.env.TURNSTILE_SECRET_KEY,
  verifyEndpoint: process.env.TURNSTILE_VERIFY_URL ?? 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
};

const imageSources = ["'self'", 'data:'];

export const config = {
  nodeEnv,
  appEnv,
  port: parseNumber(process.env.BACKEND_PORT ?? process.env.PORT, 5000),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  sentryDsn: process.env.SENTRY_DSN_BE,
  sentryTracesSampleRate: Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.05'),
  allowedOrigins,
  cacheTtlMs,
  logLevel,
  stageOrigin,
  apiOrigin,
  frontendOrigin,
  workerOrigin,
  cspReportUri,
  workerAttempts: parseNumber(process.env.WORKER_JOB_ATTEMPTS, 3),
  workerBackoffMs: parseNumber(process.env.WORKER_BACKOFF_MS, 5000),
  // Worker concurrency is an infrastructure constraint, not a user limit
  workerConcurrency: parseNumber(process.env.WORKER_CONCURRENCY, 2),
  csp: {
    connectSources,
    imageSources,
  },
  email: {
    sendgrid: {
      enabled: process.env.SENDGRID_API_KEY ? process.env.SENDGRID_ENABLED !== 'false' : false,
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL,
      resetUrl: process.env.PASSWORD_RESET_URL ?? (frontendOrigin ? `${frontendOrigin}/reset-password` : undefined),
    },
  },
  // Payment Provider Configuration - DISABLED for 100% free launch
  // All payment integrations are disabled to provide unlimited free scanning
  payments: {
    stripe: {
      enabled: false, // Disabled for 100% free launch
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      priceId: process.env.STRIPE_PRICE_ID,
    },
    lemonsqueezy: {
      enabled: false, // Disabled for 100% free launch
      apiKey: process.env.LEMONSQUEEZY_API_KEY,
      storeId: process.env.LEMONSQUEEZY_STORE_ID,
      variantId: process.env.LEMONSQUEEZY_VARIANT_ID,
      webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
      checkoutRedirectUrl: process.env.LEMONSQUEEZY_CHECKOUT_REDIRECT_URL,
    },
    wallet: {
      enabled: false, // Disabled for 100% free launch
      requiredTokens: parseNumber(process.env.WALLET_PRO_TOKEN_THRESHOLD, 10000),
    },
  },
  objectStorage: objectStorageConfiguration,
  turnstile: turnstileConfiguration,
};

export type AppConfig = typeof config;

export function isDev() {
  return config.nodeEnv === 'development';
}
