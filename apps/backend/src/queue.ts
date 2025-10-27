import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { config } from './config.js';
import { logger } from './logger.js';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const RedisConstructor = Redis as unknown as typeof import('ioredis').default;

/**
 * Optimized Redis connections for BullMQ with better performance settings
 */
const baseConnection = new RedisConstructor(config.redisUrl, {
  maxRetriesPerRequest: null,
  // Connection pool optimization
  connectTimeout: 10000,
  lazyConnect: true,
  keepAlive: 30000,
  // Performance optimization
  enableReadyCheck: true,
  // Pipeline commands for better throughput
  enableAutoPipelining: true,
});

const eventsConnection = baseConnection.duplicate();

/**
 * Enhanced scan queue with optimized configuration for production throughput
 */
export const scanQueue = new Queue('scan.site', {
  connection: baseConnection,
  defaultJobOptions: {
    removeOnComplete: {
      count: config.nodeEnv === 'production' ? 50 : 10,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: config.nodeEnv === 'production' ? 100 : 20,
      age: 48 * 3600, // 48 hours
    },
    // Enhanced retry strategy for better reliability
    attempts: config.workerAttempts,
    backoff: {
      type: 'exponential',
      delay: config.workerBackoffMs,
    },
    // Priority and delay configurations
    priority: 0, // Default priority
    delay: 0,
  },
  // Remove invalid settings that don't exist in the Queue options
});

export const scanEvents = new QueueEvents('scan.site', {
  connection: eventsConnection,
});

/**
 * Enhanced queue event monitoring with performance metrics
 */
scanEvents.on('failed', ({ jobId, failedReason, prev }) => {
  logger.warn({
    jobId,
    failedReason,
    attemptsMade: prev === 'failed' ? 1 : 'unknown',
  }, 'Queue job failed');
});

scanEvents.on('completed', ({ jobId, returnvalue, prev }) => {
  logger.debug({
    jobId,
    previousState: prev,
    duration: typeof returnvalue === 'object' && returnvalue && 'duration' in returnvalue ? (returnvalue as { duration?: number }).duration : undefined,
  }, 'Queue job completed');
});

scanEvents.on('waiting', ({ jobId }) => {
  logger.debug({ jobId }, 'Job waiting in queue');
});

scanEvents.on('active', ({ jobId, prev }) => {
  logger.debug({
    jobId,
    previousState: prev,
  }, 'Job started processing');
});

scanEvents.on('stalled', ({ jobId }) => {
  logger.warn({ jobId }, 'Job stalled and will be retried');
});

scanEvents.on('progress', ({ jobId, data }) => {
  logger.debug({
    jobId,
    progress: data,
  }, 'Job progress update');
});

/**
 * Queue priority levels for different scan types
 */
export const SCAN_PRIORITY = {
  URGENT: 10,    // High-priority scans (paid users, retries)
  NORMAL: 0,     // Standard scan requests
  LOW: -10,      // Background/bulk processing
} as const;

/**
 * Scan job data structure
 */
export interface ScanJobData {
  scanId: string;
  url?: string;
  [key: string]: unknown;
}

/**
 * Add a scan job with priority and complexity-based configuration
 */
export async function addScanJob(
  jobType: string,
  data: ScanJobData,
  options: {
    priority?: number;
    scanComplexity?: 'simple' | 'complex';
    isRetry?: boolean;
    requestId?: string;
  } = {}
) {
  const {
    priority = SCAN_PRIORITY.NORMAL,
    scanComplexity = 'simple',
    isRetry = false,
    requestId,
  } = options;

  // Adjust timeouts and retry strategies based on complexity
  const complexityConfig = scanComplexity === 'complex' ? {
    attempts: config.workerAttempts + 2, // More retries for complex scans
    backoff: {
      type: 'exponential' as const,
      delay: config.workerBackoffMs * 1.5, // Longer backoff
    },
  } : {
    attempts: config.workerAttempts,
    backoff: {
      type: 'exponential' as const,
      delay: config.workerBackoffMs,
    },
  };

  const jobOptions = {
    jobId: data.scanId,
    priority,
    ...complexityConfig,
    removeOnComplete: config.nodeEnv === 'development' ? false : 50,
    removeOnFail: config.nodeEnv === 'development' ? false : 100,
  };

  logger.info({
    jobType,
    scanId: data.scanId,
    priority,
    scanComplexity,
    isRetry,
    requestId,
  }, 'Adding scan job to queue');

  return scanQueue.add(jobType, data, jobOptions);
}

/**
 * Get queue metrics for monitoring
 */
export async function getQueueMetrics() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      scanQueue.getWaiting(),
      scanQueue.getActive(),
      scanQueue.getCompleted(),
      scanQueue.getFailed(),
      scanQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      totalPending: waiting.length + active.length + delayed.length,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get queue metrics');
    return null;
  }
}

export async function closeQueueConnections() {
  await scanEvents.close();
  if (eventsConnection.status !== 'end') {
    await eventsConnection.quit();
  }
  await scanQueue.close();
  if (baseConnection.status !== 'end') {
    await baseConnection.quit();
  }
}

export async function checkRedisConnection() {
  await baseConnection.ping();
}

/**
 * Initialize Redis connections for queue operations with timeout and state checking
 * Must be called during application startup
 */
export async function initQueueConnections(): Promise<void> {
  try {
    logger.info('Initializing Redis connections for queue...');

    // Check if already connected or connecting
    const baseReady = baseConnection.status === 'ready' || baseConnection.status === 'connecting';
    const eventsReady = eventsConnection.status === 'ready' || eventsConnection.status === 'connecting';

    if (baseReady && eventsReady) {
      logger.info('Queue Redis connections already connected or connecting, skipping...');
      return;
    }

    // Set a timeout for connection to prevent hanging
    const connectionTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Queue Redis connection timeout after 15s')), 15000);
    });

    // Race between connection and timeout
    await Promise.race([
      (async () => {
        // Connect base connection first
        if (baseConnection.status !== 'ready') {
          logger.debug('Connecting base Redis connection...');
          await baseConnection.connect();
          await baseConnection.ping();
          logger.debug('Base Redis connection established');
        }

        // Events connection is a duplicate, so it should share the same underlying connection
        // We only need to verify it's working
        if (eventsConnection.status !== 'ready') {
          logger.debug('Connecting events Redis connection...');
          await eventsConnection.connect();
          await eventsConnection.ping();
          logger.debug('Events Redis connection established');
        }
      })(),
      connectionTimeout,
    ]);

    logger.info('Queue Redis connections initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize queue Redis connections');
    throw new Error('Failed to connect to Redis for queue operations');
  }
}