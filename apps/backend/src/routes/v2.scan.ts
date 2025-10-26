import { Router, type Request } from "express";
import { z } from "zod";
import {
  UrlScanRequestSchema,
  AppScanRequestSchema,
  AddressScanRequestSchema,
  ScanQueuedResponseSchema,
  normalizeUrl,
} from "@privacy-advisor/shared";
import type { SafeUser } from "../services/authService.js";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { addScanJob, SCAN_PRIORITY, scanQueue } from "../queue.js";
import { createScanWithSlug } from "../services/slug.js";
import { findReusableScan } from "../services/dedupe.js";
import { logger } from "../logger.js";
import { config } from "../config.js";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../cache.js";
import { optionalAuth } from "../middleware/auth.js";
import { scanRateLimiter, rateLimitService, type RequestWithRateLimit } from "../middleware/scanRateLimit.js";
import { requireTurnstile } from "../middleware/turnstile.js";

const UrlScanBodySchema = UrlScanRequestSchema.extend({
  force: z.boolean().optional(),
  isPrivate: z.boolean().optional(), // Pro users can make scans private
});

const CachedResponseSchema = ScanQueuedResponseSchema.extend({
  deduped: z.literal(true),
});

export const scanV2Router = Router();

scanV2Router.post(['/', '/url'], optionalAuth, scanRateLimiter, requireTurnstile, async (req, res) => {
  const parsed = UrlScanBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return problem(res, 400, 'Invalid Request', parsed.error.flatten());
  }

  const { url, force, isPrivate } = parsed.data;
  const user = (req as Request & { user?: SafeUser }).user;

  // Determine if user is Pro with active subscription
  const isPro =
    user &&
    (user.subscription === 'PRO' || user.subscription === 'TEAM') &&
    (user.subscriptionStatus === 'ACTIVE' || user.subscriptionStatus === 'TRIALING');

  let normalized: URL;
  try {
    normalized = normalizeUrl(url);
  } catch (error) {
    return problem(res, 400, 'Invalid URL', error instanceof Error ? error.message : 'Unable to parse URL');
  }

  const normalizedInput = normalized.toString();

  if (!force) {
    const cached = await findReusableScan(prisma, normalizedInput);
    if (cached) {
      logger.info({ scanId: cached.id, requestId: res.locals.requestId }, 'Reusing cached scan result');
      const body = CachedResponseSchema.parse({
        scanId: cached.id,
        slug: cached.slug,
        deduped: true,
      });
      return res.json(body);
    }
  }

  try {
    // Prepare scan data with user tracking and privacy settings
    const scanData = {
      targetType: 'url',
      input: url,
      normalizedInput,
      status: 'queued',
      progress: 0,
      source: force ? 'manual-force' : 'manual',
      // User tracking
      userId: user?.id || null,
      scannerIp: req.ip || null,
      // Privacy settings: Pro users can choose, Free users are always public
      isPublic: isPro ? !(isPrivate ?? false) : true,
      isProScan: isPro ?? false,
    };

    const scan = await createScanWithSlug(prisma, scanData);

    await addScanJob(
      'scan-url',
      {
        scanId: scan.id,
        url: normalized.href,
        normalizedInput,
        requestId: res.locals.requestId,
      },
      {
        // Pro users get higher priority in queue
        priority: isPro ? SCAN_PRIORITY.URGENT : (force ? SCAN_PRIORITY.URGENT : SCAN_PRIORITY.NORMAL),
        scanComplexity: 'simple', // Could be determined based on URL complexity
        isRetry: false,
        requestId: res.locals.requestId,
      }
    );

    // Increment rate limit for free users AFTER successful scan creation
    if (!isPro) {
      const identifier = user?.id || req.ip || 'unknown';
      try {
        await rateLimitService.incrementScan(identifier);
        logger.debug({ identifier, scanId: scan.id }, 'Rate limit incremented');
      } catch (error) {
        // Log error but don't fail the request - scan is already queued
        logger.error({ error, identifier, scanId: scan.id }, 'Failed to increment rate limit');
      }
    }

    // Get updated rate limit info for response
    let rateLimitInfo = null;
    if (!isPro) {
      const identifier = user?.id || req.ip || 'unknown';
      try {
        const rateLimit = await rateLimitService.getRateLimitStatus(identifier);
        rateLimitInfo = {
          scansUsed: rateLimit.scansUsed,
          scansRemaining: rateLimit.scansRemaining,
          resetAt: rateLimit.resetAt,
        };
      } catch (error) {
        logger.error({ error, identifier }, 'Failed to get rate limit status');
      }
    }

    const response = ScanQueuedResponseSchema.parse({
      scanId: scan.id,
      slug: scan.slug,
    });

    res.status(202).json({
      ...response,
      rateLimit: rateLimitInfo,
    });
  } catch (error) {
    logger.error({ error, requestId: res.locals.requestId }, 'Failed to enqueue scan');
    return problem(res, 500, 'Unable to queue scan');
  }
});

scanV2Router.get('/:id/status', async (req, res) => {
  const scanId = req.params.id;

  const cacheKey = CACHE_KEYS.SCAN_STATUS(scanId);

  let scanData = await CacheService.get<{
    id: string;
    status: string;
    score: number | null;
    label: string | null;
    slug: string | null;
    updatedAt: Date;
    progress: number | null;
  }>(cacheKey);

  if (!scanData) {
    scanData = await prisma.scan.findUnique({
      where: { id: scanId },
      select: {
        id: true,
        status: true,
        score: true,
        label: true,
        slug: true,
        updatedAt: true,
        progress: true,
      },
    });

    if (!scanData) {
      return problem(res, 404, 'Scan not found');
    }

    if (scanData.status === 'done' || scanData.status === 'error') {
      await CacheService.set(cacheKey, scanData, CACHE_TTL.SCAN_STATUS);
    } else {
      await CacheService.del(cacheKey);
    }
  }

  let progress = scanData.progress ?? 0;

  if (scanData.status === 'queued' || scanData.status === 'running') {
    await CacheService.del(cacheKey);
    try {
      const job = await scanQueue.getJob(scanId);
      if (job) {
        const rawJobProgress = job.progress as number | Record<string, unknown> | undefined;
        const jobProgress = typeof rawJobProgress === 'number' ? rawJobProgress : undefined;
        if (typeof jobProgress === 'number') {
          progress = jobProgress;
          if (scanData.progress !== jobProgress) {
            await prisma.scan.update({
              where: { id: scanId },
              data: { progress: jobProgress },
            }).catch((error) => {
              logger.debug({ error, scanId, jobProgress }, 'Failed to persist live progress');
            });
            scanData.progress = jobProgress;
          }
        }
      }
    } catch (error) {
      logger.debug({ error, scanId }, 'Failed to fetch queue progress');
    }
    progress = Math.max(0, Math.min(progress, 99));
  } else if (scanData.status === 'done') {
    progress = 100;
    if (scanData.progress !== 100) {
      await prisma.scan.update({
        where: { id: scanId },
        data: { progress: 100 },
      }).catch((error) => {
        logger.debug({ error, scanId }, 'Failed to persist final progress');
      });
    }
  } else {
    progress = Math.max(0, Math.min(progress, 100));
  }

  progress = Math.max(0, Math.min(100, Math.round(progress)));

  res.json({
    status: scanData.status,
    progress,
    score: scanData.score ?? undefined,
    label: scanData.label ?? undefined,
    slug: scanData.slug ?? undefined,
    updatedAt: scanData.updatedAt,
  });
});

scanV2Router.post('/app', async (req, res) => {
  const parsed = AppScanRequestSchema.safeParse(req.body);
  if (!parsed.success) return problem(res, 400, 'Invalid Request', parsed.error.flatten());

  const { appId } = parsed.data;
  const scan = await createScanWithSlug(prisma, {
    targetType: 'app',
    input: appId,
    status: 'done',
    progress: 100,
    source: 'stub',
    score: 75,
    label: 'Caution',
    summary: 'App scan stubbed. Detailed analysis coming soon.',
  });
  const response = ScanQueuedResponseSchema.parse({ scanId: scan.id, slug: scan.slug });
  res.json(response);
});

scanV2Router.post('/address', async (req, res) => {
  const parsed = AddressScanRequestSchema.safeParse(req.body);
  if (!parsed.success) return problem(res, 400, 'Invalid Request', parsed.error.flatten());
  const scan = await createScanWithSlug(prisma, {
    targetType: 'address',
    input: parsed.data.address,
    status: 'done',
    progress: 100,
    source: 'stub',
    score: 80,
    label: 'Safe',
    summary: 'Address reputation stubbed. Detailed analysis coming soon.',
    meta: { chain: parsed.data.chain },
  });
  const response = ScanQueuedResponseSchema.parse({ scanId: scan.id, slug: scan.slug });
  res.json(response);
});

/**
 * Get scan history for authenticated user
 *
 * GET /api/scans/history
 * Requires: Authentication
 * Returns: { scans, daysBack, isPro, total }
 *
 * Free users: last 7 days
 * Pro users: last 90 days
 */
scanV2Router.get('/history', async (req, res) => {
  // Import auth middleware dynamically to avoid circular dependency
  const { requireAuth } = await import('../middleware/auth.js');

  // Apply auth middleware
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const user = (req as Request & { user?: SafeUser }).user;

  if (!user) {
    return problem(res, 401, 'Unauthorized', 'User not authenticated');
  }

  try {
    // Determine history period based on subscription tier
    const isPro =
      (user.subscription === 'PRO' || user.subscription === 'TEAM') &&
      (user.subscriptionStatus === 'ACTIVE' || user.subscriptionStatus === 'TRIALING');

    const daysBack = isPro ? 90 : 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Get scan history for user
    const scans = await prisma.scan.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: cutoffDate,
        },
      },
      select: {
        id: true,
        slug: true,
        targetType: true,
        input: true,
        normalizedInput: true,
        status: true,
        score: true,
        label: true,
        isPublic: true,
        isProScan: true,
        source: true,
        createdAt: true,
        finishedAt: true,
        meta: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to 100 most recent scans
    });

    logger.debug(
      {
        userId: user.id,
        isPro,
        daysBack,
        scanCount: scans.length,
      },
      'Retrieved scan history'
    );

    res.json({
      scans: scans.map((scan) => ({
        scanId: scan.id,
        slug: scan.slug,
        targetType: scan.targetType,
        url: scan.input,
        normalizedInput: scan.normalizedInput ?? undefined,
        status: scan.status,
        score: scan.score ?? undefined,
        label: scan.label ?? undefined,
        isPublic: scan.isPublic,
        isProScan: scan.isProScan,
        source: scan.source,
        batchId: (scan.meta as any)?.batchId ?? undefined,
        createdAt: scan.createdAt,
        finishedAt: scan.finishedAt ?? undefined,
      })),
      total: scans.length,
      daysBack,
      isPro,
      cutoffDate,
    });
  } catch (error) {
    logger.error({ error, userId: user.id }, 'Failed to get scan history');
    return problem(res, 500, 'Internal Server Error', 'Failed to get scan history');
  }
});
