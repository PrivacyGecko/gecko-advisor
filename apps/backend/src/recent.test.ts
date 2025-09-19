import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { prisma } from './prisma.js';

type RecentItem = {
  slug: string;
  domain: string;
  evidenceCount: number;
  score: number;
  label: string;
};

describe('GET /api/reports/recent', () => {
  let scanId = '';
  const slug = 'testslug';
  const canRun = process.env.RUN_DB_TESTS === '1';

  beforeAll(async () => {
    if (!canRun) return;
    const scan = await prisma.scan.create({
      data: {
        input: 'https://example.com',
        normalizedInput: 'https://example.com/',
        targetType: 'url',
        status: 'done',
        slug,
        score: 95,
        label: 'Safe',
      },
    });
    scanId = scan.id;
    await prisma.evidence.createMany({
      data: [
        { scanId, kind: 'tls', severity: 1, title: 'TLS', details: { grade: 'A' } },
        { scanId, kind: 'policy', severity: 1, title: 'Policy', details: {} },
      ],
    });
  });

  afterAll(async () => {
    if (!canRun) return;
    await prisma.evidence.deleteMany({ where: { scanId } });
    await prisma.scan.deleteMany({ where: { id: scanId } });
  });

  const run = canRun ? it : it.skip;
  run('returns recent completed scans with evidence counts', async () => {
    const res = await request(app).get('/api/reports/recent').expect(200);
    const data = res.body as { items?: RecentItem[] };
    expect(Array.isArray(data.items)).toBe(true);
    const item = (data.items ?? []).find((x) => x.slug === slug);
    expect(item).toBeTruthy();
    expect(item?.domain).toBe('example.com');
    expect((item?.evidenceCount ?? 0)).toBeGreaterThanOrEqual(2);
    expect(item?.score).toBe(95);
    expect(item?.label).toBe('Safe');
  }, 15000);
});
