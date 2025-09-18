import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { z } from 'zod';
import {
  UrlScanRequestSchema,
  AppScanRequestSchema,
  AddressScanRequestSchema,
  ScanQueuedResponseSchema,
} from '@privacy-advisor/shared';
import { problem } from './problem';
import { adminGuard } from './middleware/admin';
import { loadDemoLists } from './lists';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { etldPlusOne } from '@privacy-advisor/shared';

export const prisma = new PrismaClient();

export const app = express();
app.use(express.json({ limit: '200kb' }));
// Behind Nginx reverse proxy; needed for accurate client IP in rate limiter
app.set('trust proxy', 1);
app.use(helmet());
app.use(morgan('tiny'));
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost',
      process.env.BASE_URL || ''
    ].filter(Boolean),
    credentials: false,
  })
);

const limiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use('/api/scan', limiter);

// Queue
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const queue = new Queue('scan.site', { connection: redis });

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/scan/url', async (req, res) => {
  const parsed = UrlScanRequestSchema.safeParse(req.body);
  if (!parsed.success) return problem(res, 400, 'Invalid Request', parsed.error.flatten());

  const { url } = parsed.data;
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return problem(res, 400, 'Invalid scheme');
    if (['localhost', '127.0.0.1'].includes(u.hostname)) return problem(res, 400, 'Disallowed host');
  } catch {
    return problem(res, 400, 'Malformed URL');
  }
  try {
    const reportSlug = (await import('nanoid')).nanoid(6);
    const scan = await prisma.scan.create({
      data: {
        input: url,
        targetType: 'url',
        status: 'queued',
        reportSlug,
      },
    });
    await queue.add('site', { scanId: scan.id, url });
    const resp = { scanId: scan.id, reportSlug };
    const v = ScanQueuedResponseSchema.parse(resp);
    res.json(v);
  } catch (e) {
    console.error(e);
    return problem(res, 500, 'Internal Error');
  }
});

app.get('/api/scan/:id/status', async (req, res) => {
  const id = req.params.id;
  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) return problem(res, 404, 'Not Found');
  const body: any = { status: scan.status };
  if (scan.score != null) body.score = scan.score;
  if (scan.label) body.label = scan.label as any;
  res.json(body);
});

app.get('/api/report/:slug', async (req, res) => {
  const slug = req.params.slug;
  const scan = await prisma.scan.findUnique({ where: { reportSlug: slug } });
  if (!scan) return problem(res, 404, 'Not Found');
  const evidence = await prisma.evidence.findMany({ where: { scanId: scan.id } });
  // Backend-derived Data Sharing heuristic (optional for MVP)
  const trackerDomains = Array.from(
    new Set(
      evidence
        .filter((e) => e.type === 'tracker')
        .map((e) => String((e.details as any)?.domain || ''))
        .filter(Boolean)
    )
  );
  const thirdpartyDomains = Array.from(
    new Set(
      evidence
        .filter((e) => e.type === 'thirdparty')
        .map((e) => String((e.details as any)?.domain || ''))
        .filter(Boolean)
    )
  );
  const cookieIssues = evidence.filter((e) => e.type === 'cookie').length;
  const index = trackerDomains.length * 2 + thirdpartyDomains.length + cookieIssues;
  let dataSharing: 'None' | 'Low' | 'Medium' | 'High' = 'None';
  if (index === 0) dataSharing = 'None';
  else if (index <= 3) dataSharing = 'Low';
  else if (index <= 8) dataSharing = 'Medium';
  else dataSharing = 'High';
  res.json({ scan, evidence, meta: { dataSharing } });
});

// Recent reports (anonymized)
app.get('/api/reports/recent', async (_req, res) => {
  const scans = await prisma.scan.findMany({
    where: { status: 'done' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, reportSlug: true, input: true, score: true, label: true, createdAt: true },
  });
  const counts = await Promise.all(
    scans.map((s) => prisma.evidence.count({ where: { scanId: s.id } }))
  );
  const items = scans.map((s, i) => {
    let domain = '';
    try {
      const u = new URL(s.input);
      domain = etldPlusOne(u.hostname);
    } catch {
      domain = s.input;
    }
    return {
      slug: s.reportSlug,
      score: s.score ?? 0,
      label: (s.label as any) ?? 'Caution',
      domain,
      createdAt: s.createdAt,
      evidenceCount: counts[i] ?? 0,
    };
  });
  res.json({ items });
});

// Stubs
app.post('/api/scan/app', async (req, res) => {
  const parsed = AppScanRequestSchema.safeParse(req.body);
  if (!parsed.success) return problem(res, 400, 'Invalid Request', parsed.error.flatten());
  const reportSlug = (await import('nanoid')).nanoid(6);
  const scan = await prisma.scan.create({
    data: {
      input: parsed.data.appId,
      targetType: 'app',
      status: 'done',
      reportSlug,
      score: 75,
      label: 'Caution',
      summary: 'App scan stubbed. Detailed analysis coming soon.',
    },
  });
  res.json({ scanId: scan.id, reportSlug });
});

app.post('/api/scan/address', async (req, res) => {
  const parsed = AddressScanRequestSchema.safeParse(req.body);
  if (!parsed.success) return problem(res, 400, 'Invalid Request', parsed.error.flatten());
  const reportSlug = (await import('nanoid')).nanoid(6);
  const scan = await prisma.scan.create({
    data: {
      input: parsed.data.address,
      targetType: 'address',
      status: 'done',
      reportSlug,
      score: 80,
      label: 'Safe',
      summary: 'Address reputation stubbed. Detailed analysis coming soon.',
    },
  });
  res.json({ scanId: scan.id, reportSlug });
});

// Admin: refresh lists into DB from bundled fixtures (no network in prod tests)
app.post('/api/admin/refresh-lists', adminGuard, async (_req, res) => {
  try {
    const loaded = await loadDemoLists();
    // Simple versioning to avoid duplicates in demo - clear and re-insert
    await prisma.cachedList.deleteMany({});
    for (const l of loaded) {
      await prisma.cachedList.create({ data: l });
    }
    res.json({ ok: true, sources: loaded.map((l) => l.source) });
  } catch (e) {
    console.error(e);
    return problem(res, 500, 'Failed to refresh lists');
  }
});

// OpenAPI YAML serve (static)
app.get('/api/openapi.yaml', async (_req, res) => {
  const p = path.resolve(process.cwd(), 'infra', 'openapi.yaml');
  const buf = await readFile(p);
  res.type('text/yaml').send(buf);
});

// RFC7807 handler fallback
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  problem(res, 500, 'Internal Error');
});

const port = Number(process.env.BACKEND_PORT || process.env.PORT || 5000);
if (!process.env.VITEST_WORKER_ID) {
  app.listen(port, () => {
    console.log(`Backend running on :${port}`);
  });
}
