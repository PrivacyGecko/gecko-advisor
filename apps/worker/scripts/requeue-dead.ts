#!/usr/bin/env node
import { Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";
import process from "node:process";

const queueName = process.argv[2] ?? 'scan.site';
const deadQueueName = process.argv[3] ?? 'scan.dead';
const limit = Number.parseInt(process.argv[4] ?? '50', 10);

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

async function main() {
  const RedisConstructor = Redis as unknown as typeof import('ioredis').default;
  const connection = new RedisConstructor(redisUrl, { maxRetriesPerRequest: null });
  const dlq = new Queue(deadQueueName, { connection });
  const targetQueue = new Queue(queueName, { connection });
  const events = new QueueEvents(queueName, { connection });

  const jobs = await dlq.getJobs(['wait', 'delayed'], 0, limit - 1);
  if (jobs.length === 0) {
    console.log('No jobs to requeue');
    await dlq.close();
    await targetQueue.close();
    await events.close();
    await connection.quit();
    return;
  }

  for (const job of jobs) {
    const data = job.data;
    const opts = { attempts: job.opts.attempts ?? 3, backoff: job.opts.backoff ?? undefined };
    console.log(`Requeuing job ${job.id}`);
    await targetQueue.add(job.name ?? 'scan:url', data, opts);
    await job.remove();
  }

  await dlq.close();
  await targetQueue.close();
  await events.close();
  await connection.quit();

  console.log(`Requeued ${jobs.length} jobs`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
