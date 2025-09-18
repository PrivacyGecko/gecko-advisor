import { PrismaClient } from '@prisma/client';
import { load as loadHtml } from 'cheerio';
import { normalizeUrl, etldPlusOne } from '@privacy-advisor/shared';
import { getLists } from './lists';

const SECURITY_HEADERS = [
  'content-security-policy',
  'referrer-policy',
  'strict-transport-security',
  'x-content-type-options',
  'permissions-policy',
];

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
  const fpDomains = new Set((lists.whotracks.fingerprinting || []).map((d) => d));

  while (queue.length && visited.size < pagesLimit && Date.now() - start < timeBudgetMs) {
    const curr = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);
    let res: Response | null = null;
    try {
      if (process.env.USE_FIXTURES === '1' && hostname.endsWith('.test')) {
        const { readFile } = await import('node:fs/promises');
        const path = await import('node:path');
        const slug = hostname.split('.')[0] ?? 'example';
        const file = path.resolve(process.cwd(), 'tests', 'fixtures', slug, 'index.html');
        const html = await readFile(file, 'utf8');
        // Minimal Response-like shim
        res = new Response(html, { headers: { 'content-type': 'text/html' } as any }) as any;
      } else {
        res = await fetch(curr, {
          redirect: 'follow',
          headers: { 'user-agent': 'PrivacyAdvisorBot/0.1' },
          signal: timeoutAbort(5000),
        });
      }
    } catch {
      continue;
    }
    if (!res) continue;

    // Headers
    for (const name of SECURITY_HEADERS) {
      if (!res.headers.has(name)) {
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
    }

    // Cookies
    const setCookies: string[] = (res.headers as any).getSetCookie?.() || [];
    for (const c of setCookies) {
      const lc = c.toLowerCase();
      if (!lc.includes('secure') || !lc.includes('samesite')) {
        await prisma.evidence.create({
          data: {
            scanId,
            type: 'cookie',
            severity: 2,
            title: 'Cookie missing Secure/SameSite',
            details: { cookie: c },
          },
        });
      }
    }

    // TLS grade once (root)
    if (visited.size === 1) {
      const grade = await gradeTls(u);
      await prisma.evidence.create({
        data: { scanId, type: 'tls', severity: 1, title: `TLS grade ${grade}`, details: { grade } },
      });
    }

    const html = await res.text();
    const $ = loadHtml(html);

    // Policy link
    const anchors = $('a[href]');
    const policy = anchors.toArray().find((a) => /privacy|policy/i.test($(a).text()) || /privacy|policy/i.test($(a).attr('href') || ''));
    if (policy && visited.size === 1) {
      await prisma.evidence.create({
        data: { scanId, type: 'policy', severity: 1, title: 'Privacy policy link detected', details: { href: $(policy).attr('href') || '' } },
      });
    }

    // Resources: scripts, images, links
    const domains = new Set<string>();
    $('script[src],img[src],link[href]').each((_i, el) => {
      const attr = $(el).attr('src') || $(el).attr('href');
      if (!attr) return;
      try {
        const ru = new URL(attr, curr);
        domains.add(ru.hostname);
        const dRoot = etldPlusOne(ru.hostname);
        const isThirdParty = dRoot !== siteRoot;
        if (isThirdParty) {
          prisma.evidence.create({
            data: {
              scanId,
              type: 'thirdparty',
              severity: 2,
              title: `Third-party request: ${ru.hostname}`,
              details: { domain: ru.hostname },
            },
          }).catch(() => {});
        }
        if (trackerDomains.has(dRoot)) {
          prisma.evidence.create({
            data: {
              scanId,
              type: 'tracker',
              severity: 3,
              title: `Tracker matched: ${dRoot}`,
              details: { domain: dRoot, fingerprinting: fpDomains.has(dRoot) },
            },
          }).catch(() => {});
        }
      } catch {
        // ignore
      }
    });

    // Fingerprinting heuristics
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

    // Mixed content
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

    // Crawl same-origin links
    $('a[href]').each((_i, a) => {
      const href = ((a as any).attribs || {}).href as string | undefined;
      if (!href) return;
      try {
        const ru = new URL(href, curr);
        if (ru.origin === origin) {
          queue.push(ru.href);
        }
      } catch {
        // ignore
      }
    });
  }

  // Compute score and save on scan
  const { computeScore } = await import('./scoring');
  const result = await computeScore(prisma, scanId);
  await prisma.scan.update({ where: { id: scanId }, data: { score: result.score, label: result.label } });
}
