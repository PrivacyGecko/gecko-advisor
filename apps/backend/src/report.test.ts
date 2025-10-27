import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { prisma } from './prisma.js';

const canRun = process.env.RUN_DB_TESTS === '1';

describe('GET /api/report/:slug includes dataSharing meta', () => {
  let scanId = '';
  const slug = 'test-report-meta';

  beforeAll(async () => {
    if (!canRun) return;
    const scan = await prisma.scan.create({
      data: {
        input: 'https://meta.test',
        normalizedInput: 'https://meta.test/',
        targetType: 'url',
        status: 'done',
        slug,
        score: 65,
        label: 'Caution',
      },
    });
    scanId = scan.id;
    await prisma.evidence.createMany({
      data: [
        { scanId, kind: 'tracker', severity: 3, title: 'Tracker A', details: { domain: 'trk.example' } },
        { scanId, kind: 'thirdparty', severity: 2, title: 'CDN', details: { domain: 'cdn.example' } },
        { scanId, kind: 'cookie', severity: 2, title: 'Missing SameSite', details: {} },
      ],
    });
  });

  afterAll(async () => {
    if (!canRun) return;
    await prisma.evidence.deleteMany({ where: { scanId } });
    await prisma.scan.deleteMany({ where: { id: scanId } });
  });

  const run = canRun ? it : it.skip;
  run('returns meta.dataSharing with allowed value', async () => {
    const res = await request(app).get(`/api/report/${slug}`).expect(200);
    const meta = res.body.meta;
    expect(meta).toBeTruthy();
    expect(['None', 'Low', 'Medium', 'High']).toContain(meta.dataSharing);
  }, 15000);
});
