import http from "node:http";
import { Worker, QueueEvents, Queue, type Job } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { scanSiteJob } from "./scanner.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { initSentry, Sentry } from "./sentry.js";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const RedisConstructor = Redis as unknown as typeof import('ioredis').default;
const baseConnection = new RedisConstructor(config.redisUrl, {
  maxRetriesPerRequest: null,
});
const eventsConnection = baseConnection.duplicate();
const prisma = new PrismaClient();
const deadLetterQueue = new Queue(config.deadLetterQueue, { connection: baseConnection });
const sentryEnabled = initSentry();

interface ScanJobData {
  scanId: string;
  url: string;
  requestId?: string;
  normalizedInput?: string;
}

export const worker = new Worker<ScanJobData>(
  config.queueName,
  async (job: Job<ScanJobData>) => {
    const { scanId, url, requestId } = job.data;
    logger.info({ jobId: job.id, scanId, requestId }, 'Starting scan job');

    // Update scan to running with progress tracking
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'running',
        startedAt: new Date(),
        progress: 0,
      },
    });

    try {
      // Pass job for progress updates
      await scanSiteJob(prisma, scanId, url, job);

      // Report 100% progress (scan status is updated atomically in scanner.ts)
      await job.updateProgress(100);

      logger.info({ jobId: job.id, scanId }, 'Scan completed');
    } catch (error) {
      logger.error({ jobId: job.id, scanId, err: error }, 'Scan failed');

      // Send to Sentry for monitoring
      if (sentryEnabled) {
        Sentry.captureException(error, {
          tags: {
            component: 'worker',
            queue: config.queueName,
          },
          contexts: {
            job: {
              id: job.id,
              name: job.name,
              attemptsMade: job.attemptsMade,
            },
          },
        });
      }

      // Determine error message based on error type
      const errorMessage = error instanceof Error ? error.message : 'Scan failed due to crawler error';
      const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('time out');
      const summary = isTimeout
        ? 'Scan timed out. The site took too long to respond or analyze.'
        : 'Scan failed due to an error during processing.';

      // Update scan status to error with meaningful message
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'error',
          finishedAt: new Date(),
          summary,
        },
      });

      throw error;
    }
  },
  {
    connection: baseConnection,
    concurrency: config.concurrency,
    // CRITICAL: Add job-level timeout to prevent hanging
    lockDuration: config.jobTimeoutMs, // Job must complete within this time
    // Settings for stalled job detection
    stalledInterval: 30_000, // Check for stalled jobs every 30 seconds
    maxStalledCount: 1, // Move to failed after 1 stalled detection
  }
);

worker.on('failed', async (job, err) => {
  if (!job) return;
  const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
  const errorMessage = err?.message ?? 'Unknown error';
  const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('stalled');

  logger.warn(
    {
      jobId: job.id,
      scanId: job.data.scanId,
      attempts: job.attemptsMade,
      err: errorMessage,
      isTimeout,
      isFinalAttempt,
    },
    'Job failed'
  );

  if (isFinalAttempt) {
    // On final failure, ensure scan is marked as error in database
    try {
      const summary = isTimeout
        ? 'Scan timed out. The site took too long to respond or analyze.'
        : 'Scan failed after multiple retry attempts.';

      await prisma.scan.update({
        where: { id: job.data.scanId },
        data: {
          status: 'error',
          finishedAt: new Date(),
          summary,
        },
      });
    } catch (updateError) {
      logger.error({ updateError, scanId: job.data.scanId }, 'Failed to update scan status on final failure');
    }

    // Add to dead letter queue for investigation
    await deadLetterQueue.add(
      'scan-failed',
      {
        scanId: job.data.scanId,
        url: job.data.url,
        requestId: job.data.requestId,
        error: errorMessage,
        isTimeout,
        failedAt: new Date().toISOString(),
      },
      { removeOnComplete: 100, removeOnFail: 500 }
    );
  }
});

export const queueEvents = new QueueEvents(config.queueName, { connection: eventsConnection });
queueEvents.on('completed', ({ jobId }) => logger.info({ jobId }, 'Job completed'));
queueEvents.on('failed', ({ jobId, failedReason }) => logger.warn({ jobId, failedReason }, 'Job failed event'));

logger.info('Worker running');

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(
    JSON.stringify({
      ok: true,
      queue: config.queueName,
      uptime: process.uptime(),
    })
  );
});

server.listen(config.healthPort, () => {
  logger.info({ port: config.healthPort }, 'Worker health endpoint ready');
});
