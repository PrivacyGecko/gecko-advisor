import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { config } from './config.js';
import { logger } from './logger.js';

const RedisConstructor = Redis as unknown as typeof import('ioredis').default;

const baseConnection = new RedisConstructor(config.redisUrl, {
  maxRetriesPerRequest: null,
});
const eventsConnection = baseConnection.duplicate();

export const scanQueue = new Queue('scan.site', {
  connection: baseConnection,
  defaultJobOptions: {
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 200,
    },
  },
});

export const scanEvents = new QueueEvents('scan.site', {
  connection: eventsConnection,
});

scanEvents.on('failed', ({ jobId, failedReason }) => {
  logger.warn({ jobId, failedReason }, 'Queue job failed');
});

scanEvents.on('completed', ({ jobId }) => {
  logger.debug({ jobId }, 'Queue job completed');
});

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
