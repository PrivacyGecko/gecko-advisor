import { Router } from "express";
import type { Prisma, Scan } from "@prisma/client";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { logger } from "../logger.js";
import { etldPlusOne } from "@privacy-advisor/shared";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../cache.js";

type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

const severityRank: Record<IssueSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

function asArray<T>(value: Prisma.JsonValue | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
}

function extractDomain(details: Prisma.JsonValue): string {
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const record = details as Record<string, unknown>;
    const domain = record.domain;
    if (typeof domain === 'string') return domain;
  }
  return '';
}

export async function buildReportPayload(scan: Scan & {
  evidence?: Array<{
    id: string;
    scanId: string;
    kind: string;
    severity: number;
    title: string;
    details: any;
    createdAt: Date;
  }>;
  issues?: Array<{
    id: string;
    scanId: string;
    key: string | null;
    severity: string;
    category: string;
    title: string;
    summary: string | null;
    howToFix: string | null;
    whyItMatters: string | null;
    references: any;
    sortWeight: number | null;
    createdAt: Date;
  }>;
}) {
  // If evidence and issues are already included, use them; otherwise fetch separately
  const evidence = scan.evidence ?? await prisma.evidence.findMany({
    where: { scanId: scan.id },
    orderBy: { createdAt: 'asc' },
  });
  const issues = scan.issues ?? await prisma.issue.findMany({
    where: { scanId: scan.id },
    orderBy: [{ sortWeight: 'asc' }, { createdAt: 'asc' }],
  });

  const severityThreshold = severityRank['medium'];

  const topFixes = issues
    .filter((issue) => severityRank[issue.severity as IssueSeverity] >= severityThreshold)
    .sort((a, b) => {
      const diff = severityRank[b.severity as IssueSeverity] - severityRank[a.severity as IssueSeverity];
      if (diff !== 0) return diff;
      return (a.sortWeight ?? 0) - (b.sortWeight ?? 0);
    })
    .slice(0, 3)
    .map((issue) => ({
      id: issue.id,
      key: issue.key ?? issue.id,
      title: issue.title,
      category: issue.category,
      severity: issue.severity,
      whyItMatters: issue.whyItMatters,
      howToFix: issue.howToFix,
      references: asArray<{ label?: string; url: string }>(issue.references),
    }));

  const formattedIssues = issues.map((issue) => ({
    id: issue.id,
    key: issue.key ?? issue.id,
    category: issue.category,
    severity: issue.severity,
    title: issue.title,
    summary: issue.summary,
    howToFix: issue.howToFix,
    whyItMatters: issue.whyItMatters,
    references: asArray<{ label?: string; url: string }>(issue.references),
    sortWeight: issue.sortWeight,
  }));

  const formattedEvidence = evidence.map((item) => ({
    id: item.id,
    scanId: item.scanId,
    kind: item.kind,
    severity: item.severity,
    title: item.title,
    details: item.details,
    createdAt: item.createdAt,
  }));

  const trackerDomains = new Set(
    evidence
      .filter((entry) => entry.kind === 'tracker')
      .map((entry) => extractDomain(entry.details))
      .filter(Boolean)
  );
  const thirdpartyDomains = new Set(
    evidence
      .filter((entry) => entry.kind === 'thirdparty')
      .map((entry) => extractDomain(entry.details))
      .filter(Boolean)
  );
  const cookieIssues = evidence.filter((entry) => entry.kind === 'cookie').length;
  const dataSharingIndex = trackerDomains.size * 2 + thirdpartyDomains.size + cookieIssues;
  let dataSharing: 'None' | 'Low' | 'Medium' | 'High' = 'None';
  if (dataSharingIndex > 8) dataSharing = 'High';
  else if (dataSharingIndex > 3) dataSharing = 'Medium';
  else if (dataSharingIndex > 0) dataSharing = 'Low';

  const domain = (() => {
    try {
      const parsed = new URL(scan.input);
      return etldPlusOne(parsed.hostname);
    } catch {
      return scan.input;
    }
  })();

  return {
    scan,
    evidence: formattedEvidence,
    issues: formattedIssues,
    topFixes,
    meta: {
      dataSharing,
      domain,
    },
  };
}

export const reportV2Router = Router();

reportV2Router.get(['/report/:slug', '/r/:slug'], async (req, res) => {
  try {
    const slug = req.params.slug;
    const scan = await prisma.scan.findUnique({
      where: { slug },
      include: {
        evidence: {
          orderBy: { createdAt: 'asc' },
        },
        issues: {
          orderBy: [{ sortWeight: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!scan) {
      return problem(res, 404, 'Report not found');
    }

    const payload = await buildReportPayload(scan);
    res.json(payload);
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Error fetching report');
    return problem(res, 500, 'Failed to load report');
  }
});

reportV2Router.get('/scan/:id', async (req, res) => {
  try {
    const scan = await prisma.scan.findUnique({
      where: { id: req.params.id },
      include: {
        evidence: {
          orderBy: { createdAt: 'asc' },
        },
        issues: {
          orderBy: [{ sortWeight: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!scan) {
      return problem(res, 404, 'Scan not found');
    }
    const payload = await buildReportPayload(scan);
    res.json(payload);
  } catch (error) {
    logger.error({ error, scanId: req.params.id }, 'Error fetching scan report');
    return problem(res, 500, 'Failed to load scan report');
  }
});

reportV2Router.get('/reports/recent', async (_req, res) => {
  try {
    const items = await CacheService.getOrSet(
      CACHE_KEYS.RECENT_REPORTS,
      async () => {
        const scans = await prisma.scan.findMany({
          where: { status: 'done' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            slug: true,
            input: true,
            score: true,
            label: true,
            createdAt: true,
            _count: {
              select: {
                evidence: true,
              },
            },
          },
        });

        return scans.map((scan) => {
          let domain = scan.input;
          try {
            const url = new URL(scan.input);
            domain = etldPlusOne(url.hostname);
          } catch {
            // ignore
          }
          return {
            slug: scan.slug,
            score: scan.score ?? 0,
            label: scan.label ?? 'Caution',
            domain,
            createdAt: scan.createdAt,
            evidenceCount: scan._count.evidence,
          };
        });
      },
      CACHE_TTL.RECENT_REPORTS
    );

    res.json({ items });
  } catch (error) {
    logger.error({ error }, 'Error fetching recent reports');
    return problem(res, 500, 'Failed to load recent reports');
  }
});

