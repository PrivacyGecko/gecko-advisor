import { Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { scanSiteJob } from './scanner.js';
import http from 'node:http';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const prisma = new PrismaClient();

export const worker = new Worker(
  'scan.site',
  async (job) => {
    const { scanId, url } = job.data as { scanId: string; url: string };
    await prisma.scan.update({ where: { id: scanId }, data: { status: 'running', startedAt: new Date() } });
    try {
      await scanSiteJob(prisma, scanId, url);
      await prisma.scan.update({ where: { id: scanId }, data: { status: 'done', finishedAt: new Date() } });
    } catch (e) {
      console.error('Scan failed', e);
      await prisma.scan.update({ where: { id: scanId }, data: { status: 'error', finishedAt: new Date(), summary: 'Scan failed' } });
      throw e;
    }
  },
  { connection: redis }
);

export const queueEvents = new QueueEvents('scan.site', { connection: redis });
queueEvents.on('completed', ({ jobId }) => console.log('Completed job', jobId));
queueEvents.on('failed', ({ jobId, failedReason }) => console.log('Failed job', jobId, failedReason));

console.log('Worker running...');

// Minimal health endpoint for container healthchecks
const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT || 5050);
http
  .createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  })
  .listen(HEALTH_PORT, () => console.log(`Worker health on :${HEALTH_PORT}`));




