import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

/**
 * Enhanced Prisma client with connection pooling, query optimization, and performance monitoring
 */
export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Query performance monitoring
prisma.$on('query', (e) => {
  const duration = Number(e.duration);

  // Log slow queries (>1000ms)
  if (duration > 1000) {
    logger.warn({
      query: e.query,
      params: e.params,
      duration,
      timestamp: e.timestamp,
    }, 'Slow database query detected');
  }

  // Log debug info for all queries in development
  if (process.env.NODE_ENV === 'development' && duration > 100) {
    logger.debug({
      query: e.query.substring(0, 200) + (e.query.length > 200 ? '...' : ''),
      duration,
    }, 'Database query');
  }
});

// Error logging
prisma.$on('error', (e) => {
  logger.error({
    target: e.target,
    message: e.message,
    timestamp: e.timestamp,
  }, 'Database error');
});

// Warning logging
prisma.$on('warn', (e) => {
  logger.warn({
    target: e.target,
    message: e.message,
    timestamp: e.timestamp,
  }, 'Database warning');
});

/**
 * Connect to the database with retry logic
 */
export async function connectDatabase(): Promise<void> {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await prisma.$connect();
      logger.info('Database connected successfully');
      return;
    } catch (error) {
      retries++;
      logger.error({
        error,
        attempt: retries,
        maxRetries,
      }, 'Failed to connect to database');

      if (retries >= maxRetries) {
        throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retries - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Graceful database disconnection
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting from database');
  }
}

/**
 * Health check for database connectivity
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}
