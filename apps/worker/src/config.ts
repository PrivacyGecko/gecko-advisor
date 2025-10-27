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

export const config = {
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  queueName: 'scan.site',
  deadLetterQueue: 'scan.dead',
  logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  sentryDsn: process.env.SENTRY_DSN_WORKER,
  sentryTracesSampleRate: Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.05'),
  jobAttempts: parseNumber(process.env.WORKER_JOB_ATTEMPTS, 3),
  backoffMs: parseNumber(process.env.WORKER_BACKOFF_MS, 5000),
  // Increased default concurrency from 2 to 5 for better throughput
  concurrency: parseNumber(process.env.WORKER_CONCURRENCY, 5),
  requestTimeoutMs: parseNumber(process.env.WORKER_REQUEST_TIMEOUT_MS, 5000),
  maxContentLength: parseNumber(process.env.WORKER_MAX_CONTENT_BYTES, 800_000),
  crawlTimeBudgetMs: parseNumber(process.env.WORKER_CRAWL_BUDGET_MS, 10_000),
  crawlPageLimit: parseNumber(process.env.WORKER_PAGE_LIMIT, 10),
  healthPort: parseNumber(process.env.WORKER_HEALTH_PORT, 5050),
  // Job-level timeout to prevent hanging jobs (in milliseconds)
  // Default: 60 seconds (includes crawling, scoring, and DB operations)
  jobTimeoutMs: parseNumber(process.env.WORKER_JOB_TIMEOUT_MS, 60_000),
  objectStorage: {
    enabled: parseBoolean(process.env.OBJECT_STORAGE_ENABLED, false),
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
    region: process.env.OBJECT_STORAGE_REGION ?? 'us-east-1',
    forcePathStyle: parseBoolean(process.env.OBJECT_STORAGE_FORCE_PATH_STYLE, true),
    accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY,
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY,
    bucket: process.env.OBJECT_STORAGE_BUCKET,
    publicUrl: process.env.OBJECT_STORAGE_PUBLIC_URL,
    reportPrefix: process.env.OBJECT_STORAGE_REPORT_PREFIX ?? 'reports/',
    signedUrlExpirySeconds: parseNumber(process.env.OBJECT_STORAGE_SIGNED_URL_SECONDS, 3600),
  },
};

export type WorkerConfig = typeof config;
