import type { RequestHandler } from "express";
import { Router } from "express";
import { checkDatabaseHealth } from "./prisma.js";
import { checkRedisConnection, getQueueMetrics } from "./queue.js";
import { CacheService } from "./cache.js";
import { logger } from "./logger.js";

export const healthRouter = Router();

/**
 * Basic liveness check - just confirms the service is running
 */
const livenessHandler: RequestHandler = (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'privacy-advisor-backend',
    version: process.env.npm_package_version || 'unknown',
  });
};

healthRouter.get('/healthz', livenessHandler);
healthRouter.get('/health', livenessHandler);

/**
 * Readiness check - confirms all dependencies are healthy
 */
healthRouter.get('/readyz', async (_req, res) => {
  const checks = await Promise.allSettled([
    checkDatabaseHealth(),
    CacheService.healthCheck(),
    checkRedisConnection().then(() => ({ healthy: true })).catch((error) => ({
      healthy: false,
      error: error.message,
    })),
  ]);

  const results = checks.map((result) =>
    result.status === 'fulfilled' ? result.value : { healthy: false, error: 'Promise rejected' }
  );

  const [dbCheck, cacheCheck, queueCheck] = results;

  const allHealthy = dbCheck?.healthy && cacheCheck?.healthy && queueCheck?.healthy;

  const response = {
    ok: allHealthy,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbCheck,
      cache: cacheCheck,
      queue: queueCheck,
    },
  };

  if (allHealthy) {
    res.json(response);
  } else {
    logger.warn({ checks: response.checks }, 'Health check failed');
    res.status(503).json(response);
  }
});

/**
 * Detailed status endpoint with performance metrics
 */
healthRouter.get('/status', async (_req, res) => {
  try {
    const startTime = Date.now();

    const [dbHealth, cacheHealth, queueHealth, queueMetrics] = await Promise.allSettled([
      checkDatabaseHealth(),
      CacheService.healthCheck(),
      checkRedisConnection().then(() => ({ healthy: true })).catch((error) => ({
        healthy: false,
        error: error.message,
      })),
      getQueueMetrics(),
    ]);

    const processMetrics = {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };

    const responseTime = Date.now() - startTime;

    const response = {
      ok: true,
      timestamp: new Date().toISOString(),
      responseTime,
      service: {
        name: 'privacy-advisor-backend',
        version: process.env.npm_package_version || 'unknown',
        environment: process.env.NODE_ENV || 'unknown',
      },
      dependencies: {
        database: dbHealth.status === 'fulfilled' ? dbHealth.value : { healthy: false },
        cache: cacheHealth.status === 'fulfilled' ? cacheHealth.value : { healthy: false },
        queue: queueHealth.status === 'fulfilled' ? queueHealth.value : { healthy: false },
      },
      metrics: {
        process: processMetrics,
        queue: queueMetrics.status === 'fulfilled' ? queueMetrics.value : null,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error({ error }, 'Error generating status report');
    res.status(500).json({
      ok: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Performance metrics endpoint for monitoring
 */
healthRouter.get('/metrics', async (_req, res) => {
  try {
    const queueMetrics = await getQueueMetrics();
    const dbHealth = await checkDatabaseHealth();
    const cacheHealth = await CacheService.healthCheck();

    // Simple Prometheus-style metrics
    const metrics = [
      `# HELP backend_up Whether the backend is up`,
      `# TYPE backend_up gauge`,
      `backend_up 1`,
      ``,
      `# HELP backend_uptime_seconds Uptime in seconds`,
      `# TYPE backend_uptime_seconds counter`,
      `backend_uptime_seconds ${process.uptime()}`,
      ``,
      `# HELP database_latency_ms Database query latency in milliseconds`,
      `# TYPE database_latency_ms gauge`,
      `database_latency_ms ${dbHealth.latency || -1}`,
      ``,
      `# HELP cache_latency_ms Cache query latency in milliseconds`,
      `# TYPE cache_latency_ms gauge`,
      `cache_latency_ms ${cacheHealth.latency || -1}`,
      ``,
    ];

    if (queueMetrics) {
      metrics.push(
        `# HELP queue_jobs_waiting Number of jobs waiting in queue`,
        `# TYPE queue_jobs_waiting gauge`,
        `queue_jobs_waiting ${queueMetrics.waiting}`,
        ``,
        `# HELP queue_jobs_active Number of active jobs`,
        `# TYPE queue_jobs_active gauge`,
        `queue_jobs_active ${queueMetrics.active}`,
        ``,
        `# HELP queue_jobs_failed Number of failed jobs`,
        `# TYPE queue_jobs_failed gauge`,
        `queue_jobs_failed ${queueMetrics.failed}`,
        ``
      );
    }

    res.set('Content-Type', 'text/plain');
    res.send(metrics.join('\n'));
  } catch (error) {
    logger.error({ error }, 'Error generating metrics');
    res.status(500).send('# Error generating metrics\n');
  }
});
