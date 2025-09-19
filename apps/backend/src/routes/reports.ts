import { Router } from "express";
import type { Prisma, Scan } from "@prisma/client";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { etldPlusOne } from "@privacy-advisor/shared";

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

async function buildReportPayload(scan: Scan) {
  const evidence = await prisma.evidence.findMany({
    where: { scanId: scan.id },
    orderBy: { createdAt: 'asc' },
  });
  const issues = await prisma.issue.findMany({
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

export const reportRouter = Router();

reportRouter.get(['/report/:slug', '/r/:slug'], async (req, res) => {
  const slug = req.params.slug;
  const scan = await prisma.scan.findUnique({ where: { slug } });
  if (!scan) {
    return problem(res, 404, 'Report not found');
  }

  const payload = await buildReportPayload(scan);
  res.json(payload);
});

reportRouter.get('/scan/:id', async (req, res) => {
  const scan = await prisma.scan.findUnique({ where: { id: req.params.id } });
  if (!scan) {
    return problem(res, 404, 'Scan not found');
  }
  const payload = await buildReportPayload(scan);
  res.json(payload);
});

reportRouter.get('/reports/recent', async (_req, res) => {
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
    },
  });

  const counts = await Promise.all(
    scans.map((s) => prisma.evidence.count({ where: { scanId: s.id } }))
  );

  const items = scans.map((scan, index) => {
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
      evidenceCount: counts[index] ?? 0,
    };
  });

  res.json({ items });
});
