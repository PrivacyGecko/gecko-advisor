import type { PrismaClient } from '@prisma/client';

/**
 * Rate Limit Service
 *
 * Manages daily scan limits for free tier users (3 scans/day).
 * Pro users bypass rate limiting entirely.
 *
 * Rate limits are tracked by:
 * - User ID (for authenticated users)
 * - IP address (for anonymous users)
 *
 * Limits reset daily at midnight UTC.
 */

export interface RateLimitInfo {
  allowed: boolean;
  scansUsed: number;
  scansRemaining: number;
  resetAt: Date;
}

export class RateLimitService {
  private static readonly FREE_TIER_LIMIT = 3;

  constructor(private prisma: PrismaClient) {}

  /**
   * Check if the identifier has exceeded their daily rate limit
   *
   * @param identifier - User ID or IP address
   * @returns Rate limit information
   */
  async checkRateLimit(identifier: string): Promise<RateLimitInfo> {
    const today = this.getTodayString();
    const resetAt = this.getTomorrowMidnight();

    // Get or create today's rate limit record
    const rateLimit = await this.prisma.rateLimit.upsert({
      where: {
        identifier_date: {
          identifier,
          date: today,
        },
      },
      update: {},
      create: {
        identifier,
        date: today,
        scansCount: 0,
      },
    });

    const scansUsed = rateLimit.scansCount;
    const scansRemaining = Math.max(0, RateLimitService.FREE_TIER_LIMIT - scansUsed);
    const allowed = scansUsed < RateLimitService.FREE_TIER_LIMIT;

    return {
      allowed,
      scansUsed,
      scansRemaining,
      resetAt,
    };
  }

  /**
   * Increment the scan count for the identifier
   *
   * @param identifier - User ID or IP address
   */
  async incrementScan(identifier: string): Promise<void> {
    const today = this.getTodayString();

    await this.prisma.rateLimit.upsert({
      where: {
        identifier_date: {
          identifier,
          date: today,
        },
      },
      update: {
        scansCount: {
          increment: 1,
        },
      },
      create: {
        identifier,
        date: today,
        scansCount: 1,
      },
    });
  }

  /**
   * Get today's date string in YYYY-MM-DD format
   */
  private getTodayString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0] || '';
  }

  /**
   * Get rate limit status for the identifier
   * Alias for checkRateLimit() for backward compatibility
   *
   * @param identifier - User ID or IP address
   * @returns Rate limit information
   */
  async getRateLimitStatus(identifier: string): Promise<RateLimitInfo> {
    return this.checkRateLimit(identifier);
  }

  /**
   * Get tomorrow's midnight UTC as a Date object
   */
  private getTomorrowMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow;
  }
}
