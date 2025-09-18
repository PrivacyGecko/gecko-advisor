import type { PrismaClient } from '@prisma/client';
import { load as loadHtml } from 'cheerio';
import { normalizeUrl, etldPlusOne } from '@privacy-advisor/shared';
import { getLists } from './lists.js';

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
            type: 'header',
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
            type: 'cookie',
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
      type: 'thirdparty',
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
      type: 'tracker',
      severity: 3,
      title: `Tracker matched: ${root}`,
      details: { domain: root, fingerprinting },
    },
  });
}

export async function scanSiteJob(prisma: PrismaClient, scanId: string, urlInput: string) {
  const u = normalizeUrl(urlInput);
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
        data: { scanId, type: 'tls', severity: 1, title: `TLS grade ${grade}`, details: { grade } },
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
          type: 'policy',
          severity: 1,
          title: 'Privacy policy link detected',
          details: { href: $(policyAnchor).attr('href') ?? '' },
        },
      });
    }

    const resourceDomains = new Set<string>();
    $('script[src],img[src],link[href]').each((_i, element) => {
      const src = $(element).attr('src') ?? $(element).attr('href') ?? '';
      if (!src) return;
      try {
        const resolved = new URL(src, curr);
        resourceDomains.add(resolved.hostname);
        const root = etldPlusOne(resolved.hostname);
        const evidence: ThirdPartyEvidence = {
          scanId,
          hostname: resolved.hostname,
          root,
          fingerprinting: fpDomains.has(root),
        };
        const isThirdParty = root !== siteRoot;
        if (isThirdParty) recordThirdParty(prisma, evidence).catch(() => {});
        if (trackerDomains.has(root)) recordTracker(prisma, evidence).catch(() => {});
      } catch {
        // ignore invalid URLs
      }
    });

    if (/navigator\.plugins|canvas|getImageData|AudioContext|OfflineAudioContext/i.test(html)) {
      await prisma.evidence.create({
        data: {
          scanId,
          type: 'fingerprint',
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
          type: 'insecure',
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
        if (resolved.origin === origin) queue.push(resolved.href);
      } catch {
        // ignore invalid URLs
      }
    });
  }

  const { computeScore } = await import('./scoring.js');
  const result = await computeScore(prisma, scanId);
  await prisma.scan.update({ where: { id: scanId }, data: { score: result.score, label: result.label } });
}
