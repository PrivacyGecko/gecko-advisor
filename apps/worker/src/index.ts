import http from "node:http";
import { Worker, QueueEvents, Queue, type Job } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { scanSiteJob } from "./scanner.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { initSentry, Sentry } from "./sentry.js";

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
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: 'running', startedAt: new Date() },
    });

    try {
      await scanSiteJob(prisma, scanId, url);
      await prisma.scan.update({
        where: { id: scanId },
        data: { status: 'done', finishedAt: new Date() },
      });
      logger.info({ jobId: job.id, scanId }, 'Scan completed');
    } catch (error) {
      logger.error({ jobId: job.id, scanId, err: error }, 'Scan failed');
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
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'error',
          finishedAt: new Date(),
          summary: 'Scan failed due to crawler error',
        },
      });
      throw error;
    }
  },
  {
    connection: baseConnection,
    concurrency: config.concurrency,
  }
);

worker.on('failed', async (job, err) => {
  if (!job) return;
  const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
  logger.warn(
    { jobId: job.id, scanId: job.data.scanId, attempts: job.attemptsMade, err: err?.message },
    'Job failed'
  );
  if (isFinalAttempt) {
    await deadLetterQueue.add(
      'scan-failed',
      {
        scanId: job.data.scanId,
        url: job.data.url,
        requestId: job.data.requestId,
        error: err?.message,
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
