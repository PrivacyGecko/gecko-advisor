// Optimized Query Patterns for Privacy Advisor
// Eliminates N+1 queries and improves sub-3s response times

import type { Prisma, Scan, PrismaClient } from "@prisma/client";

// OPTIMIZATION 1: Single query for complete report data
export async function buildReportPayloadOptimized(
  prisma: PrismaClient,
  scanIdentifier: { slug?: string; id?: string }
) {
  const whereClause = scanIdentifier.slug
    ? { slug: scanIdentifier.slug }
    : { id: scanIdentifier.id };

  // Single query with all relations - eliminates N+1 problem
  const scanWithRelations = await prisma.scan.findUnique({
    where: whereClause,
    include: {
      evidence: {
        orderBy: { createdAt: 'asc' },
        // Only select fields needed for report generation
        select: {
          id: true,
          scanId: true,
          kind: true,
          severity: true,
          title: true,
          details: true,
          createdAt: true,
        }
      },
      issues: {
        orderBy: [
          { sortWeight: 'asc' },
          { createdAt: 'asc' }
        ],
        select: {
          id: true,
          key: true,
          severity: true,
          category: true,
          title: true,
          summary: true,
          howToFix: true,
          whyItMatters: true,
          references: true,
          sortWeight: true,
        }
      },
      // Include metrics if using the optimized schema
      _count: {
        select: {
          evidence: true,
          issues: true,
        }
      }
    }
  });

  if (!scanWithRelations) {
    return null;
  }

  // Rest of the processing logic remains the same but operates on already-loaded data
  const { evidence, issues, ...scan } = scanWithRelations;

  return buildReportFromLoadedData(scan, evidence, issues);
}

// OPTIMIZATION 2: Batch query for recent reports with evidence counts
export async function getRecentReportsOptimized(prisma: PrismaClient, limit = 10) {
  // Single query with aggregation - eliminates individual count queries
  const scansWithCounts = await prisma.scan.findMany({
    where: {
      status: 'done'
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    select: {
      id: true,
      slug: true,
      input: true,
      score: true,
      label: true,
      createdAt: true,
      _count: {
        select: {
          evidence: true
        }
      }
    }
  });

  return scansWithCounts.map(scan => ({
    slug: scan.slug,
    score: scan.score ?? 0,
    label: scan.label ?? 'Caution',
    domain: extractDomainOptimized(scan.input),
    createdAt: scan.createdAt,
    evidenceCount: scan._count.evidence,
  }));
}

// OPTIMIZATION 3: Optimized dedupe query with better indexing
export async function findReusableScanOptimized(
  prisma: PrismaClient,
  normalizedInput: string,
  cacheTtlMs: number
) {
  const since = new Date(Date.now() - cacheTtlMs);

  // Leverages the new compound index for optimal performance
  return prisma.scan.findFirst({
    where: {
      normalizedInput,
      status: 'done',
      finishedAt: {
        gte: since,
      },
    },
    select: {
      id: true,
      slug: true,
      finishedAt: true,
    },
    orderBy: {
      finishedAt: 'desc',
    },
  });
}

// OPTIMIZATION 4: Bulk evidence analysis for data sharing metrics
export async function calculateDataSharingMetricsOptimized(
  prisma: PrismaClient,
  scanId: string
) {
  // Single aggregation query instead of filtering in application code
  const metrics = await prisma.$queryRaw<Array<{
    kind: string;
    count: bigint;
  }>>`
    SELECT
      kind,
      COUNT(*) as count
    FROM "Evidence"
    WHERE "scanId" = ${scanId}
      AND "kind" IN ('tracker', 'thirdparty', 'cookie')
    GROUP BY kind
  `;

  const counts = metrics.reduce((acc, { kind, count }) => {
    acc[kind] = Number(count);
    return acc;
  }, {} as Record<string, number>);

  const trackerCount = counts.tracker || 0;
  const thirdPartyCount = counts.thirdparty || 0;
  const cookieCount = counts.cookie || 0;

  const dataSharingIndex = trackerCount * 2 + thirdPartyCount + cookieCount;

  let dataSharing: 'None' | 'Low' | 'Medium' | 'High' = 'None';
  if (dataSharingIndex > 8) dataSharing = 'High';
  else if (dataSharingIndex > 3) dataSharing = 'Medium';
  else if (dataSharingIndex > 0) dataSharing = 'Low';

  return { dataSharing, trackerCount, thirdPartyCount, cookieCount };
}

// OPTIMIZATION 5: Cached domain extraction
const domainCache = new Map<string, string>();

function extractDomainOptimized(input: string): string {
  if (domainCache.has(input)) {
    return domainCache.get(input)!;
  }

  let domain = input;
  try {
    const parsed = new URL(input);
    // Assuming etldPlusOne is available
    domain = etldPlusOne(parsed.hostname);
  } catch {
    // Keep original input if URL parsing fails
  }

  // Cache result (implement LRU eviction for production)
  if (domainCache.size < 1000) {
    domainCache.set(input, domain);
  }

  return domain;
}

// Helper function for processing loaded data
function buildReportFromLoadedData(
  scan: any,
  evidence: any[],
  issues: any[]
) {
  // Implementation of the existing report building logic
  // but operating on already-loaded data instead of making additional queries

  const severityRank = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1,
  };

  const severityThreshold = severityRank['medium'];

  const topFixes = issues
    .filter((issue) => severityRank[issue.severity as keyof typeof severityRank] >= severityThreshold)
    .sort((a, b) => {
      const diff = severityRank[b.severity as keyof typeof severityRank] -
                   severityRank[a.severity as keyof typeof severityRank];
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
      references: Array.isArray(issue.references) ? issue.references : [],
    }));

  // Calculate data sharing metrics from evidence
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

  const domain = extractDomainOptimized(scan.input);

  return {
    scan,
    evidence,
    issues,
    topFixes,
    meta: {
      dataSharing,
      domain,
    },
  };
}

function extractDomain(details: any): string {
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const domain = details.domain;
    if (typeof domain === 'string') return domain;
  }
  return '';
}

// Import/export helper (would need actual etldPlusOne import)
declare function etldPlusOne(hostname: string): string;