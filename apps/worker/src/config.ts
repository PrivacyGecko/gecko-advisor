import process from "node:process";

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
  concurrency: parseNumber(process.env.WORKER_CONCURRENCY, 2),
  requestTimeoutMs: parseNumber(process.env.WORKER_REQUEST_TIMEOUT_MS, 5000),
  maxContentLength: parseNumber(process.env.WORKER_MAX_CONTENT_BYTES, 800_000),
  crawlTimeBudgetMs: parseNumber(process.env.WORKER_CRAWL_BUDGET_MS, 10_000),
  crawlPageLimit: parseNumber(process.env.WORKER_PAGE_LIMIT, 10),
  healthPort: parseNumber(process.env.WORKER_HEALTH_PORT, 5050),
};

export type WorkerConfig = typeof config;
