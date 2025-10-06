import { Router } from "express";
import { z } from "zod";
import {
  UrlScanRequestSchema,
  AppScanRequestSchema,
  AddressScanRequestSchema,
  ScanQueuedResponseSchema,
  normalizeUrl,
} from "@privacy-advisor/shared";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { addScanJob, SCAN_PRIORITY } from "../queue.js";
import { createScanWithSlug } from "../services/slug.js";
import { findReusableScan } from "../services/dedupe.js";
import { logger } from "../logger.js";
import { config } from "../config.js";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../cache.js";

const UrlScanBodySchema = UrlScanRequestSchema.extend({
  force: z.boolean().optional(),
});

const CachedResponseSchema = ScanQueuedResponseSchema.extend({
  deduped: z.literal(true),
});

export const scanV2Router = Router();

scanV2Router.post(['/', '/url'], async (req, res) => {
  const parsed = UrlScanBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return problem(res, 400, 'Invalid Request', parsed.error.flatten());
  }

  const { url, force } = parsed.data;

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
    const scan = await createScanWithSlug(prisma, {
      targetType: 'url',
      input: url,
      normalizedInput,
      status: 'queued',
      source: force ? 'manual-force' : 'manual',
    });

    await addScanJob(
      'scan-url',
      {
        scanId: scan.id,
        url: normalized.href,
        normalizedInput,
        requestId: res.locals.requestId,
      },
      {
        priority: force ? SCAN_PRIORITY.URGENT : SCAN_PRIORITY.NORMAL,
        scanComplexity: 'simple', // Could be determined based on URL complexity
        isRetry: false,
        requestId: res.locals.requestId,
      }
    );

    const response = ScanQueuedResponseSchema.parse({
      scanId: scan.id,
      slug: scan.slug,
    });

    res.status(202).json(response);
  } catch (error) {
    logger.error({ error, requestId: res.locals.requestId }, 'Failed to enqueue scan');
    return problem(res, 500, 'Unable to queue scan');
  }
});

scanV2Router.get('/:id/status', async (req, res) => {
  const scanId = req.params.id;

  // Use shorter cache TTL for active scans, longer for completed ones
  const scanData = await CacheService.getOrSet(
    CACHE_KEYS.SCAN_STATUS(scanId),
    async () => {
      const scan = await prisma.scan.findUnique({
        where: { id: scanId },
        select: {
          id: true,
          status: true,
          score: true,
          label: true,
          slug: true,
          updatedAt: true,
        },
      });

      return scan;
    },
    CACHE_TTL.SCAN_STATUS
  );

  if (!scanData) {
    return problem(res, 404, 'Scan not found');
  }

  res.json({
    status: scanData.status,
    score: scanData.score ?? undefined,
    label: scanData.label ?? undefined,
    slug: scanData.slug,
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
    source: 'stub',
    score: 80,
    label: 'Safe',
    summary: 'Address reputation stubbed. Detailed analysis coming soon.',
    meta: { chain: parsed.data.chain },
  });
  const response = ScanQueuedResponseSchema.parse({ scanId: scan.id, slug: scan.slug });
  res.json(response);
});


