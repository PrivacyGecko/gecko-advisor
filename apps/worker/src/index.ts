import { Worker, QueueEvents, type Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { scanSiteJob } from './scanner.js';
import http from 'node:http';

const RedisConstructor = Redis as unknown as typeof import('ioredis').default;
const redis = new RedisConstructor(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const prisma = new PrismaClient();

export const worker = new Worker(
  'scan.site',
  async (job: Job<{ scanId: string; url: string }>) => {
    const { scanId, url } = job.data as { scanId: string; url: string };
    await prisma.scan.update({ where: { id: scanId }, data: { status: 'running', startedAt: new Date() } });
    try {
      await scanSiteJob(prisma, scanId, url);
      await prisma.scan.update({ where: { id: scanId }, data: { status: 'done', finishedAt: new Date() } });
    } catch (error: unknown) {
      console.error('Scan failed', error);
      await prisma.scan.update({ where: { id: scanId }, data: { status: 'error', finishedAt: new Date(), summary: 'Scan failed' } });
      throw error;
    }
  },
  { connection: redis }
);

export const queueEvents = new QueueEvents('scan.site', { connection: redis });
queueEvents.on('completed', ({ jobId }: { jobId: string }) => console.log('Completed job', jobId));
queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => console.log('Failed job', jobId, failedReason));

console.log('Worker running...');

// Minimal health endpoint for container healthchecks
const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT || 5050);
http
  .createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  })
  .listen(HEALTH_PORT, () => console.log(`Worker health on :${HEALTH_PORT}`));




