import type { Prisma, PrismaClient } from '@prisma/client';
import { load as loadHtml } from 'cheerio';
import { normalizeUrl, etldPlusOne } from '@privacy-advisor/shared';
import { isIP } from 'node:net';
import { getLists } from './lists.js';
import { logger } from './logger.js';

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

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b = -1] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80') || normalized.startsWith('fe90') || normalized.startsWith('fea0') || normalized.startsWith('feb0')) return true;
  if (normalized.startsWith('fec0') || normalized.startsWith('fed0') || normalized.startsWith('fee0') || normalized.startsWith('fef0')) return true;
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice('::ffff:'.length);
    return isPrivateIpv4(mapped);
  }
  return false;
}

function normalizeHost(hostname: string): string {
  const trimmed = hostname.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function isDisallowedHost(hostname: string): boolean {
  const bare = normalizeHost(hostname);
  const lower = bare.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) {
    return true;
  }
  const ipVersion = isIP(bare);
  if (ipVersion === 4) {
    return isPrivateIpv4(bare);
  }
  if (ipVersion === 6) {
    return isPrivateIpv6(bare);
  }
  return false;
}

function assertAllowedTarget(url: URL) {
  if (isDisallowedHost(url.hostname)) {
    throw new Error('Refusing to scan disallowed host: ' + url.hostname);
  }
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
    const parsed = new URL(curr);
    if (isDisallowedHost(parsed.hostname)) {
      logger.warn({ hostname: parsed.hostname }, 'Blocked fetch to disallowed host');
      return null;
    }
  } catch {
    return null;
  }

  try {
    const response = await fetch(curr, {
      redirect: 'follow',
      headers: { 'user-agent': 'PrivacyAdvisorBot/0.1' },
      signal: timeoutAbort(5000),
    });
    try {
      const finalHost = new URL(response.url).hostname;
      if (isDisallowedHost(finalHost)) {
        logger.warn({ hostname: finalHost }, 'Blocked response from disallowed host');
        return null;
      }
    } catch {
      // ignore parse errors for response URL
    }
    return response as FetchResponse;
  } catch {
    return null;
  }
}
async function recordHeaderIssues(
  prisma: PrismaClient,
  scanId: string,
  headers: Headers,
): Promise<void> {
  await Promise.all(
    SECURITY_HEADERS.map(async (name) => {
      if (!headers.has(name)) {
        await prisma.evidence.create({
          data: {
            scanId,
            kind: 'header',
            severity: 2,
            title: `Missing header: ${name}`,
            details: { name },
          },
        });
      }
    }),
  );
}

async function recordCookieIssues(
  prisma: PrismaClient,
  scanId: string,
  headers: Headers,
): Promise<void> {
  const cookies = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  await Promise.all(
    cookies.map(async (cookie) => {
      const lower = cookie.toLowerCase();
      if (!lower.includes('secure') || !lower.includes('samesite')) {
        await prisma.evidence.create({
          data: {
            scanId,
            kind: 'cookie',
            severity: 2,
            title: 'Cookie missing Secure/SameSite',
            details: { cookie },
          },
        });
      }
    }),
  );
}

async function recordThirdParty(
  prisma: PrismaClient,
  evidence: ThirdPartyEvidence,
): Promise<void> {
  const { scanId, hostname, root, fingerprinting } = evidence;
  await prisma.evidence.create({
    data: {
      scanId,
      kind: 'thirdparty',
      severity: 2,
      title: `Third-party request: ${hostname}`,
      details: { domain: hostname, root, fingerprinting },
    },
  });
}

async function recordTracker(
  prisma: PrismaClient,
  evidence: ThirdPartyEvidence,
): Promise<void> {
  const { scanId, root, fingerprinting } = evidence;
  await prisma.evidence.create({
    data: {
      scanId,
      kind: 'tracker',
      severity: 3,
      title: `Tracker matched: ${root}`,
      details: { domain: root, fingerprinting },
    },
  });
}

export async function scanSiteJob(prisma: PrismaClient, scanId: string, urlInput: string) {
  const u = normalizeUrl(urlInput);
  assertAllowedTarget(u);
  const origin = u.origin;
  const hostname = u.hostname;
  const siteRoot = etldPlusOne(hostname);
  const lists = await getLists(prisma);
  const visited = new Set<string>();
  const queue: string[] = [u.href];
  const pagesLimit = 10;
  const timeBudgetMs = 10_000;
  const start = Date.now();

  const trackerDomains = new Set(lists.easyprivacy.domains);
  const fpDomains = new Set((lists.whotracks.fingerprinting ?? []).map((domain: string) => domain));

  while (queue.length && visited.size < pagesLimit && Date.now() - start < timeBudgetMs) {
    const curr = queue.shift();
    if (!curr || visited.has(curr)) continue;
    visited.add(curr);

    const response = await fetchPage(curr, hostname);
    if (!response) continue;

    const { headers } = response;
    if (!isHeaders(headers)) continue;

    await recordHeaderIssues(prisma, scanId, headers);
    await recordCookieIssues(prisma, scanId, headers);

    if (visited.size === 1) {
      const grade = await gradeTls(u);
      await prisma.evidence.create({
        data: { scanId, kind: 'tls', severity: 1, title: `TLS grade ${grade}`, details: { grade } },
      });
    }

    const html = await response.text();
    const $ = loadHtml(html);

    const policyAnchor = $('a[href]').toArray().find((anchor) => {
      const text = $(anchor).text();
      const href = $(anchor).attr('href') ?? '';
      return /privacy|policy/i.test(text) || /privacy|policy/i.test(href);
    });

    if (policyAnchor && visited.size === 1) {
      await prisma.evidence.create({
        data: {
          scanId,
          kind: 'policy',
          severity: 1,
          title: 'Privacy policy link detected',
          details: { href: $(policyAnchor).attr('href') ?? '' },
        },
      });
    }

    const resourceDomains = new Set<string>();
    const evidenceWrites: Array<Promise<unknown>> = [];
    $('script[src],img[src],link[href]').each((_i, element) => {
      const src = $(element).attr('src') ?? $(element).attr('href') ?? '';
      if (!src) return;
      try {
        const resolved = new URL(src, curr);
        if (isDisallowedHost(resolved.hostname)) return;
        resourceDomains.add(resolved.hostname);
        const root = etldPlusOne(resolved.hostname);
        const evidence: ThirdPartyEvidence = {
          scanId,
          hostname: resolved.hostname,
          root,
          fingerprinting: fpDomains.has(root),
        };
        const isThirdParty = root !== siteRoot;
        if (isThirdParty) {
          evidenceWrites.push(
            recordThirdParty(prisma, evidence).catch((error) => {
              logger.warn({ error, hostname: resolved.hostname }, 'Failed to record third-party evidence');
            }),
          );
        }
        if (trackerDomains.has(root)) {
          evidenceWrites.push(
            recordTracker(prisma, evidence).catch((error) => {
              logger.warn({ error, hostname: resolved.hostname }, 'Failed to record tracker evidence');
            }),
          );
        }
      } catch {
        // ignore invalid URLs
      }
    });
    if (evidenceWrites.length) {
      await Promise.all(evidenceWrites);
    }

    if (/navigator\.plugins|canvas|getImageData|AudioContext|OfflineAudioContext/i.test(html)) {
      await prisma.evidence.create({
        data: {
          scanId,
          kind: 'fingerprint',
          severity: 3,
          title: 'Fingerprinting heuristics detected',
          details: {},
        },
      });
    }

    if (u.protocol === 'https:' && /http:\/\//i.test(html)) {
      await prisma.evidence.create({
        data: {
          scanId,
          kind: 'insecure',
          severity: 3,
          title: 'Mixed content detected',
          details: {},
        },
      });
    }

    $('a[href]').each((_i, anchor) => {
      const href = (anchor as { attribs?: { href?: string } }).attribs?.href;
      if (!href) return;
      try {
        const resolved = new URL(href, curr);
        if (isDisallowedHost(resolved.hostname)) return;
        if (resolved.origin === origin) queue.push(resolved.href);
      } catch {
        // ignore invalid URLs
      }
    });
  }

  const { computeScore } = await import('./scoring.js');
  const result = await computeScore(prisma, scanId);

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
}








