import type { Prisma, PrismaClient } from '@prisma/client';
import { load as loadHtml } from 'cheerio';
import { normalizeUrl, etldPlusOne, buildReportPayload, buildReportStorageKey } from '@privacy-advisor/shared';
import { getLists } from './lists.js';
import { logger } from './logger.js';
import { objectStorage } from './objectStorage.js';
import { config } from './config.js';

/**
 * Sanitizes HTML content to prevent XSS attacks by removing dangerous elements and attributes.
 */
function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Limit HTML size to prevent DoS attacks
  if (html.length > 1_000_000) { // 1MB limit
    html = html.substring(0, 1_000_000);
  }

  // Remove dangerous script tags and their content
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*>/gi, '');

  // Remove dangerous attributes that can execute JavaScript
  html = html.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, ''); // onclick, onload, etc.
  html = html.replace(/\s+javascript\s*:/gi, '');
  html = html.replace(/\s+data\s*:/gi, '');
  html = html.replace(/\s+vbscript\s*:/gi, '');

  // Remove potentially dangerous tags
  html = html.replace(/<(iframe|embed|object|applet|meta|base)[^>]*>/gi, '');
  html = html.replace(/<\/(iframe|embed|object|applet|meta|base)>/gi, '');

  return html;
}

/**
 * Validates and sanitizes URLs to prevent SSRF and other URL-based attacks.
 */
function sanitizeUrl(url: string, baseUrl?: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Trim and limit length
  url = url.trim();
  if (url.length === 0 || url.length > 2048) {
    return null;
  }

  try {
    let resolvedUrl: URL;

    // Try to resolve relative URLs
    if (baseUrl) {
      resolvedUrl = new URL(url, baseUrl);
    } else {
      resolvedUrl = new URL(url);
    }

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(resolvedUrl.protocol)) {
      return null;
    }

    // Prevent access to private networks
    const hostname = resolvedUrl.hostname.toLowerCase();
    if (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('172.17.') ||
        hostname.startsWith('172.18.') ||
        hostname.startsWith('172.19.') ||
        hostname.startsWith('172.2') ||
        hostname.startsWith('172.30.') ||
        hostname.startsWith('172.31.') ||
        hostname.startsWith('169.254.')) {
      return null;
    }

    return resolvedUrl.href;
  } catch {
    return null;
  }
}

const SECURITY_HEADERS = [
  'content-security-policy',
  'referrer-policy',
  'strict-transport-security',
  'x-content-type-options',
  'permissions-policy',
] as const;

type ThirdPartyEvidence = {
  scanId: string;
  hostname: string;
  root: string;
  fingerprinting: boolean;
};

type EvidenceData = {
  scanId: string;
  kind: string;
  severity: number;
  title: string;
  details: Prisma.InputJsonValue;
};

type FetchResponse = {
  headers: Headers;
  text(): Promise<string>;
};

type FixtureFetch = {
  html: string;
};

const isHeaders = (value: unknown): value is Headers =>
  typeof value === 'object' && value !== null && 'has' in (value as Headers);

function timeoutAbort(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms).unref?.();
  return controller.signal;
}

async function gradeTls(u: URL): Promise<'A' | 'B' | 'C' | 'D' | 'F'> {
  if (u.protocol !== 'https:') return 'C';
  // Quick heuristic: https assumed A/B for MVP; a real TLS dial is out-of-scope here
  return 'A';
}

async function loadFixture(hostname: string): Promise<FixtureFetch | null> {
  try {
    const { readFile } = await import('node:fs/promises');
    const path = await import('node:path');
    const slug = hostname.split('.')[0] ?? 'example';
    const file = path.resolve(process.cwd(), 'tests', 'fixtures', slug, 'index.html');
    const html = await readFile(file, 'utf8');
    return { html };
  } catch {
    return null;
  }
}

async function fetchPage(curr: string, hostname: string): Promise<FetchResponse | null> {
  if (process.env.USE_FIXTURES === '1' && hostname.endsWith('.test')) {
    const fixture = await loadFixture(hostname);
    if (!fixture) return null;
    const headers = new Headers({ 'content-type': 'text/html' });
    return { headers, text: async () => fixture.html } satisfies FetchResponse;
  }

  try {
    const response = await fetch(curr, {
      redirect: 'follow',
      headers: { 'user-agent': 'PrivacyAdvisorBot/0.1' },
      signal: timeoutAbort(5000),
    });
    return response as FetchResponse;
  } catch {
    return null;
  }
}

function collectHeaderIssues(
  scanId: string,
  headers: Headers,
): EvidenceData[] {
  const evidence: EvidenceData[] = [];
  for (const name of SECURITY_HEADERS) {
    if (!headers.has(name)) {
      evidence.push({
        scanId,
        kind: 'header',
        severity: 2,
        title: `Missing header: ${name}`,
        details: { name },
      });
    }
  }
  return evidence;
}

function collectCookieIssues(
  scanId: string,
  headers: Headers,
): EvidenceData[] {
  const evidence: EvidenceData[] = [];
  const cookies = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  for (const cookie of cookies) {
    const lower = cookie.toLowerCase();
    if (!lower.includes('secure') || !lower.includes('samesite')) {
      evidence.push({
        scanId,
        kind: 'cookie',
        severity: 2,
        title: 'Cookie missing Secure/SameSite',
        details: { cookie },
      });
    }
  }
  return evidence;
}

function createThirdPartyEvidence(
  evidence: ThirdPartyEvidence,
): EvidenceData {
  const { scanId, hostname, root, fingerprinting } = evidence;
  return {
    scanId,
    kind: 'thirdparty',
    severity: 2,
    title: `Third-party request: ${hostname}`,
    details: { domain: hostname, root, fingerprinting },
  };
}

function createTrackerEvidence(
  evidence: ThirdPartyEvidence,
): EvidenceData {
  const { scanId, root, fingerprinting } = evidence;
  return {
    scanId,
    kind: 'tracker',
    severity: 3,
    title: `Tracker matched: ${root}`,
    details: { domain: root, fingerprinting },
  };
}

export async function scanSiteJob(
  prisma: PrismaClient,
  scanId: string,
  urlInput: string,
  job?: { updateProgress: (progress: number) => Promise<void> }
) {
  const reportProgress = async (value: number) => {
    const tasks: Promise<unknown>[] = [];

    if (job) {
      tasks.push(
        job.updateProgress(value).catch((error) => {
          logger.debug({ error, scanId, value }, 'Failed to update job progress');
        })
      );
    }

    tasks.push(
      prisma.scan.update({
        where: { id: scanId },
        data: { progress: value },
      }).catch((error) => {
        logger.debug({ error, scanId, value }, 'Failed to persist scan progress');
      })
    );

    await Promise.all(tasks);
  };

  // Initial setup - 10% progress
  await reportProgress(10);

  const u = normalizeUrl(urlInput);
  const origin = u.origin;
  const hostname = u.hostname;
  const siteRoot = etldPlusOne(hostname);

  // Load privacy lists - 20% progress
  await reportProgress(20);
  const lists = await getLists(prisma);

  const visited = new Set<string>();
  const queue: string[] = [u.href];
  const pagesLimit = 10;
  const timeBudgetMs = 10_000;
  const start = Date.now();

  const trackerDomains = new Set(lists.easyprivacy.domains);
  const fpDomains = new Set((lists.whotracks.fingerprinting ?? []).map((domain: string) => domain));

  // Collect all evidence in memory for batch insertion
  const allEvidence: EvidenceData[] = [];
  const seenThirdParties = new Set<string>();
  const seenTrackers = new Set<string>();

  // Crawling phase: 30% - 70% progress
  let crawlProgress = 0;

  while (queue.length && visited.size < pagesLimit && Date.now() - start < timeBudgetMs) {
    const curr = queue.shift();
    if (!curr || visited.has(curr)) continue;
    visited.add(curr);

    // Update progress during crawl (30% - 70% range)
    crawlProgress = 30 + Math.floor((visited.size / pagesLimit) * 40);
    await reportProgress(crawlProgress);

    const response = await fetchPage(curr, hostname);
    if (!response) continue;

    const { headers } = response;
    if (!isHeaders(headers)) continue;

    // Collect header and cookie issues
    allEvidence.push(...collectHeaderIssues(scanId, headers));
    allEvidence.push(...collectCookieIssues(scanId, headers));

    if (visited.size === 1) {
      const grade = await gradeTls(u);
      allEvidence.push({
        scanId,
        kind: 'tls',
        severity: 1,
        title: `TLS grade ${grade}`,
        details: { grade },
      });
    }

    const rawHtml = await response.text();
    const sanitizedHtml = sanitizeHtml(rawHtml);
    const $ = loadHtml(sanitizedHtml);

    const policyAnchor = $('a[href]').toArray().find((anchor) => {
      const text = $(anchor).text();
      const href = $(anchor).attr('href') ?? '';
      return /privacy|policy/i.test(text) || /privacy|policy/i.test(href);
    });

    if (policyAnchor && visited.size === 1) {
      allEvidence.push({
        scanId,
        kind: 'policy',
        severity: 1,
        title: 'Privacy policy link detected',
        details: { href: $(policyAnchor).attr('href') ?? '' },
      });
    }

    // Collect third-party and tracker evidence
    $('script[src],img[src],link[href]').each((_i, element) => {
      const src = $(element).attr('src') ?? $(element).attr('href') ?? '';
      if (!src) return;

      const sanitizedSrc = sanitizeUrl(src, curr);
      if (!sanitizedSrc) return;

      try {
        const resolved = new URL(sanitizedSrc);
        const root = etldPlusOne(resolved.hostname);
        const evidence: ThirdPartyEvidence = {
          scanId,
          hostname: resolved.hostname,
          root,
          fingerprinting: fpDomains.has(root),
        };
        const isThirdParty = root !== siteRoot;

        // Use deduplication to avoid duplicate evidence
        if (isThirdParty && !seenThirdParties.has(resolved.hostname)) {
          seenThirdParties.add(resolved.hostname);
          allEvidence.push(createThirdPartyEvidence(evidence));
        }

        if (trackerDomains.has(root) && !seenTrackers.has(root)) {
          seenTrackers.add(root);
          allEvidence.push(createTrackerEvidence(evidence));
        }
      } catch {
        // ignore invalid URLs
      }
    });

    if (/navigator\.plugins|canvas|getImageData|AudioContext|OfflineAudioContext/i.test(sanitizedHtml)) {
      allEvidence.push({
        scanId,
        kind: 'fingerprint',
        severity: 3,
        title: 'Fingerprinting heuristics detected',
        details: {},
      });
    }

    if (u.protocol === 'https:' && /http:\/\//i.test(sanitizedHtml)) {
      allEvidence.push({
        scanId,
        kind: 'insecure',
        severity: 3,
        title: 'Mixed content detected',
        details: {},
      });
    }

    $('a[href]').each((_i, anchor) => {
      const href = (anchor as { attribs?: { href?: string } }).attribs?.href;
      if (!href) return;

      const sanitizedHref = sanitizeUrl(href, curr);
      if (!sanitizedHref) return;

      try {
        const resolved = new URL(sanitizedHref);
        if (resolved.origin === origin) queue.push(resolved.href);
      } catch {
        // ignore invalid URLs
      }
    });
  }

  // Batch insert all evidence - 70% progress
  await reportProgress(70);
  if (allEvidence.length > 0) {
    await prisma.evidence.createMany({
      data: allEvidence,
      skipDuplicates: true,
    });
  }

  // Scoring phase - 75% progress
  await reportProgress(75);

  const { computeScore } = await import('./scoring.js');
  const result = await computeScore(prisma, scanId);

  // Saving results - 90% progress
  await reportProgress(90);

  await prisma.$transaction(async (tx) => {
    await tx.issue.deleteMany({ where: { scanId } });
    if (result.issues.length) {
      await tx.issue.createMany({
        data: result.issues.map((issue) => ({
          scanId,
          key: issue.key,
          severity: issue.severity,
          category: issue.category,
          title: issue.title,
          summary: issue.summary,
          howToFix: issue.howToFix,
          whyItMatters: issue.whyItMatters,
          references: issue.references ?? [],
          sortWeight: issue.sortWeight ?? 0,
        })),
      });
    }
    await tx.scan.update({
      where: { id: scanId },
      data: {
        score: result.score,
        label: result.label,
        summary: result.summary,
        meta: result.meta as Prisma.InputJsonValue,
      },
    });
  });

  if (objectStorage.isEnabled()) {
    try {
      const enrichedScan = await prisma.scan.findUnique({
        where: { id: scanId },
        include: {
          evidence: { orderBy: { createdAt: 'asc' } },
          issues: { orderBy: [{ sortWeight: 'asc' }, { createdAt: 'asc' }] },
        },
      });

      if (enrichedScan) {
        const payload = buildReportPayload(enrichedScan, {
          evidence: enrichedScan.evidence ?? [],
          issues: enrichedScan.issues ?? [],
        });

        const storageKey = buildReportStorageKey(scanId, {
          prefix: config.objectStorage.reportPrefix ?? 'reports/',
        });

        const stored = await objectStorage.uploadJson(storageKey, payload, {
          metadata: {
            'scan-id': scanId,
            slug: enrichedScan.slug ?? '',
            'stored-at': new Date().toISOString(),
          },
        });

        if (stored) {
          logger.debug({ scanId, storageKey }, 'Archived scan payload to object storage');
        }
      }
    } catch (error) {
      logger.warn({ error, scanId }, 'Failed to archive scan payload to object storage');
    }
  }
}




