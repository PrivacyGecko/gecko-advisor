import Redis from 'ioredis';
import { config } from './config.js';
import { logger } from './logger.js';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const RedisConstructor = Redis as unknown as typeof import('ioredis').default;

/**
 * Redis client for caching with retry logic and error handling
 */
export const redis = new RedisConstructor(config.redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,
  lazyConnect: true,
});

redis.on('connect', () => {
  logger.info('Redis cache connected successfully');
});

redis.on('error', (error) => {
  logger.error({ error }, 'Redis cache connection error');
});

redis.on('ready', () => {
  logger.debug('Redis cache ready');
});

redis.on('reconnecting', () => {
  logger.info('Redis cache reconnecting');
});

/**
 * Cache keys for different data types
 */
export const CACHE_KEYS = {
  RECENT_REPORTS: 'recent_reports',
  SCAN_STATUS: (scanId: string) => `scan_status:${scanId}`,
  REPORT_PAYLOAD: (scanId: string) => `report_payload:${scanId}`,
  EVIDENCE_COUNT: (scanId: string) => `evidence_count:${scanId}`,
} as const;

/**
 * Cache TTL values in seconds
 */
export const CACHE_TTL = {
  RECENT_REPORTS: 300, // 5 minutes
  SCAN_STATUS: 60, // 1 minute
  REPORT_PAYLOAD: 900, // 15 minutes (for completed scans)
  EVIDENCE_COUNT: 600, // 10 minutes
} as const;

/**
 * Generic cache utility functions
 */
export class CacheService {
  /**
   * Get a value from cache with JSON parsing
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      logger.warn({ error, key }, 'Failed to get value from cache');
      return null;
    }
  }

  /**
   * Set a value in cache with JSON serialization
   */
  static async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);

      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }

      return true;
    } catch (error) {
      logger.warn({ error, key }, 'Failed to set value in cache');
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  static async del(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.warn({ error, key }, 'Failed to delete key from cache');
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  static async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;

      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      logger.warn({ error, pattern }, 'Failed to delete keys by pattern');
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.warn({ error, key }, 'Failed to check key existence');
      return false;
    }
  }

  /**
   * Get or set pattern - fetch from cache, or compute and cache if not found
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const fresh = await fetcher();

    // Cache the result
    await this.set(key, fresh, ttlSeconds);

    return fresh;
  }

  /**
   * Health check for Redis connectivity
   */
  static async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await redis.ping();
      const latency = Date.now() - start;

      return {
        healthy: true,
        latency,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown Redis error',
      };
    }
  }
}

/**
 * Initialize Redis cache connection with timeout and state checking
 * Must be called during application startup
 */
export async function connectCache(): Promise<void> {
  try {
    logger.info('Initializing Redis cache connection...');

    // Check if already connected or connecting
    if (redis.status === 'ready' || redis.status === 'connect') {
      logger.info('Redis cache already connected or connecting, skipping...');
      return;
    }

    // Set a timeout for connection to prevent hanging
    const connectionTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Redis cache connection timeout after 15s')), 15000);
    });

    // Race between connection and timeout
    await Promise.race([
      (async () => {
        // Only connect if not already connected
        if (redis.status !== 'ready') {
          await redis.connect();
        }
        // Verify connection
        await redis.ping();
      })(),
      connectionTimeout,
    ]);

    logger.info('Redis cache connection initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Redis cache connection');
    throw new Error('Failed to connect to Redis for caching');
  }
}

/**
 * Graceful Redis disconnection
 */
export async function disconnectCache(): Promise<void> {
  try {
    await redis.quit();
    logger.info('Redis cache disconnected successfully');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting from Redis cache');
  }
}