import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { normalizeUrl } from '@privacy-advisor/shared';
import type { SafeUser } from '../services/authService.js';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import { requirePro } from '../middleware/auth.js';
import { addScanJob, SCAN_PRIORITY } from '../queue.js';
import { createScanWithSlug } from '../services/slug.js';
import { createId } from '@paralleldrive/cuid2';

export const batchRouter = Router();

/**
 * Batch scan request schema
 * Validates 1-10 URLs and privacy settings
 */
const BatchScanRequestSchema = z.object({
  urls: z
    .array(z.string().url('Invalid URL format'))
    .min(1, 'At least 1 URL required')
    .max(10, 'Maximum 10 URLs allowed per batch'),
  isPrivate: z.boolean().optional().default(false),
});

/**
 * Batch scan response schema
 */
const BatchScanResponseSchema = z.object({
  batchId: z.string(),
  totalScans: z.number(),
  scans: z.array(
    z.object({
      scanId: z.string(),
      slug: z.string(),
      url: z.string(),
    })
  ),
});

/**
 * Submit batch scan request
 *
 * POST /api/scan/batch
 * Requires: Pro subscription
 * Body: { urls: string[], isPrivate?: boolean }
 * Returns: { batchId, totalScans, scans: [...] }
 *
 * Creates multiple scan records with shared batchId
 * Queues all jobs with URGENT priority for Pro users
 */
batchRouter.post('/', requirePro, async (req: Request, res: Response) => {
  const parsed = BatchScanRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return problem(res, 400, 'Invalid Request', parsed.error.flatten());
  }

  const { urls, isPrivate } = parsed.data;
  const user = (req as Request & { user?: SafeUser }).user;

  if (!user) {
    return problem(res, 401, 'Unauthorized', 'User not authenticated');
  }

  try {
    // Generate batch ID for tracking related scans
    const batchId = createId();

    // Normalize and validate all URLs first
    const normalizedUrls: { original: string; normalized: string }[] = [];

    for (const url of urls) {
      try {
        const normalized = normalizeUrl(url);
        normalizedUrls.push({
          original: url,
          normalized: normalized.toString(),
        });
      } catch (error) {
        return problem(
          res,
          400,
          'Invalid URL',
          `Failed to parse URL: ${url}. ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Create all scan records sequentially (not in transaction for simplicity)
    const scans = await Promise.all(
      normalizedUrls.map((urlData) =>
        createScanWithSlug(prisma, {
          targetType: 'url',
          input: urlData.original,
          normalizedInput: urlData.normalized,
          status: 'queued',
          progress: 0,
          source: 'batch',
          user: user.id ? { connect: { id: user.id } } : undefined,
          scannerIp: req.ip || null,
          isPublic: !isPrivate, // Pro users can make batch scans private
          isProScan: true,
          meta: { batchId }, // Store batch ID in metadata
        })
      )
    );

    // Queue all jobs with URGENT priority
    const queuePromises = scans.map((scan, index) =>
      addScanJob(
        'scan-url',
        {
          scanId: scan.id,
          url: normalizedUrls[index]!.normalized,
          normalizedInput: normalizedUrls[index]!.normalized,
          requestId: res.locals.requestId,
          batchId,
        },
        {
          priority: SCAN_PRIORITY.URGENT, // Pro batch scans get highest priority
          scanComplexity: 'simple',
          isRetry: false,
          requestId: res.locals.requestId,
        }
      )
    );

    await Promise.all(queuePromises);

    logger.info(
      {
        userId: user.id,
        batchId,
        totalScans: scans.length,
        isPrivate,
      },
      'Created batch scan request'
    );

    // Format response
    const response = BatchScanResponseSchema.parse({
      batchId,
      totalScans: scans.length,
      scans: scans.map((scan, index) => ({
        scanId: scan.id,
        slug: scan.slug,
        url: normalizedUrls[index]!.original,
      })),
    });

    res.status(202).json(response);
  } catch (error) {
    logger.error(
      { error, userId: user.id, urlCount: urls.length },
      'Failed to create batch scan'
    );
    return problem(res, 500, 'Internal Server Error', 'Failed to create batch scan');
  }
});

/**
 * Get batch scan status
 *
 * GET /api/scan/batch/:batchId/status
 * Requires: Pro subscription
 * Returns: { batchId, total, completed, failed, processing, queued, scans: [...] }
 */
batchRouter.get('/:batchId/status', requirePro, async (req: Request, res: Response) => {
  const { batchId } = req.params;
  const user = (req as Request & { user?: SafeUser }).user;

  if (!user) {
    return problem(res, 401, 'Unauthorized', 'User not authenticated');
  }

  if (!batchId) {
    return problem(res, 400, 'Bad Request', 'Batch ID required');
  }

  try {
    // Find all scans with this batch ID
    const scans = await prisma.scan.findMany({
      where: {
        meta: {
          path: ['batchId'],
          equals: batchId,
        },
        userId: user.id, // Ensure user can only see their own batches
      },
      select: {
        id: true,
        slug: true,
        input: true,
        normalizedInput: true,
        status: true,
        score: true,
        label: true,
        createdAt: true,
        finishedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (scans.length === 0) {
      return problem(res, 404, 'Not Found', 'Batch not found or no scans in batch');
    }

    // Calculate status counts
    const statusCounts = {
      total: scans.length,
      completed: scans.filter((s) => s.status === 'done').length,
      failed: scans.filter((s) => s.status === 'failed').length,
      processing: scans.filter((s) => s.status === 'processing').length,
      queued: scans.filter((s) => s.status === 'queued').length,
    };

    // Check if all scans are complete
    const isComplete = statusCounts.completed + statusCounts.failed === statusCounts.total;

    logger.debug(
      {
        userId: user.id,
        batchId,
        ...statusCounts,
      },
      'Retrieved batch scan status'
    );

    res.json({
      batchId,
      ...statusCounts,
      isComplete,
      scans: scans.map((scan) => ({
        scanId: scan.id,
        slug: scan.slug,
        url: scan.input,
        status: scan.status,
        score: scan.score ?? undefined,
        label: scan.label ?? undefined,
        createdAt: scan.createdAt,
        finishedAt: scan.finishedAt ?? undefined,
      })),
    });
  } catch (error) {
    logger.error({ error, userId: user.id, batchId }, 'Failed to get batch status');
    return problem(res, 500, 'Internal Server Error', 'Failed to get batch status');
  }
});

/**
 * Get user's batch history
 *
 * GET /api/scan/batch/history
 * Requires: Pro subscription
 * Returns: Array of batch summaries
 */
batchRouter.get('/history', requirePro, async (req: Request, res: Response) => {
  const user = (req as Request & { user?: SafeUser }).user;

  if (!user) {
    return problem(res, 401, 'Unauthorized', 'User not authenticated');
  }

  try {
    // Find all scans with batch IDs for this user
    const batchScans = await prisma.scan.findMany({
      where: {
        userId: user.id,
        source: 'batch',
        meta: {
          not: Prisma.DbNull,
        },
      },
      select: {
        id: true,
        slug: true,
        input: true,
        status: true,
        score: true,
        createdAt: true,
        finishedAt: true,
        meta: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to recent 100 batch scans
    });

    // Group by batch ID
    const batches = new Map<
      string,
      {
        batchId: string;
        total: number;
        completed: number;
        failed: number;
        processing: number;
        queued: number;
        createdAt: Date;
        scans: typeof batchScans;
      }
    >();

    for (const scan of batchScans) {
      const batchId = (scan.meta as any)?.batchId;
      if (!batchId) continue;

      if (!batches.has(batchId)) {
        batches.set(batchId, {
          batchId,
          total: 0,
          completed: 0,
          failed: 0,
          processing: 0,
          queued: 0,
          createdAt: scan.createdAt,
          scans: [],
        });
      }

      const batch = batches.get(batchId)!;
      batch.total++;
      batch.scans.push(scan);

      if (scan.status === 'done') batch.completed++;
      else if (scan.status === 'failed') batch.failed++;
      else if (scan.status === 'processing') batch.processing++;
      else if (scan.status === 'queued') batch.queued++;

      // Update createdAt to earliest scan in batch
      if (scan.createdAt < batch.createdAt) {
        batch.createdAt = scan.createdAt;
      }
    }

    // Convert to array and sort by creation date
    const batchArray = Array.from(batches.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    logger.debug(
      {
        userId: user.id,
        batchCount: batchArray.length,
      },
      'Retrieved batch history'
    );

    res.json({
      batches: batchArray.map((batch) => ({
        batchId: batch.batchId,
        total: batch.total,
        completed: batch.completed,
        failed: batch.failed,
        processing: batch.processing,
        queued: batch.queued,
        isComplete: batch.completed + batch.failed === batch.total,
        createdAt: batch.createdAt,
      })),
    });
  } catch (error) {
    logger.error({ error, userId: user.id }, 'Failed to get batch history');
    return problem(res, 500, 'Internal Server Error', 'Failed to get batch history');
  }
});
