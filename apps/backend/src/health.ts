import { Router } from "express";
import { prisma } from "./prisma.js";
import { checkRedisConnection } from "./queue.js";

export const healthRouter = Router();

healthRouter.get('/healthz', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

healthRouter.get('/readyz', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await checkRedisConnection();
    res.json({ ok: true });
  } catch (error) {
    res.status(503).json({ ok: false, error: error instanceof Error ? error.message : 'unavailable' });
  }
});
