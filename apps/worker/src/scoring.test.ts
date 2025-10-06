import { describe, it, expect } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { computeScore } from './scoring.js';

type MockEvidence = {
  id: string;
  kind: string;
  details: Record<string, unknown>;
};

type MockScan = {
  input: string;
  normalizedInput?: string | null;
};

type MockPrisma = {
  evidence: {
    findMany: (args: { where: { scanId: string } }) => Promise<MockEvidence[]>;
  };
  scan: {
    findUnique: (args: { where: { id: string }; select?: { input: boolean; normalizedInput: boolean } }) => Promise<MockScan | null>;
  };
};

describe('computeScore', () => {
  const createPrisma = (records: MockEvidence[], scan: MockScan = { input: 'example.com', normalizedInput: 'https://example.com' }): MockPrisma => ({
    evidence: {
      findMany: async () => records,
    },
    scan: {
      findUnique: async () => scan,
    },
  });

  it('returns baseline score and issues when no evidence present', async () => {
    const prisma = createPrisma([]) as unknown as PrismaClient;
    const result = await computeScore(prisma, 'scan');
    // With no evidence and bonuses for no trackers (+5) and missing policy penalty (-5),
    // base score should be 100 + 5 (no trackers) - 5 (no policy) = 100
    expect(result.score).toBe(100);
    expect(result.label).toBe('Safe');
    expect(result.issues.find((issue) => issue.key === 'compliance.policy')).toBeTruthy();
  });

  it('applies penalties for trackers and third-party evidence', async () => {
    const prisma = createPrisma([
      { id: 'tracker', kind: 'tracker', details: { domain: 'tracker.com' } },
      { id: 'third', kind: 'thirdparty', details: { domain: 'other.com' } },
    ]) as unknown as PrismaClient;
    const result = await computeScore(prisma, 'scan');
    expect(result.score).toBeLessThan(100);
    expect(result.explanations.length).toBeGreaterThan(0);
    expect(result.issues.some((issue) => issue.key === 'tracking.trackers')).toBe(true);
  });

  it('deduplicates evidence across multiple pages (FIX #1)', async () => {
    // Simulate 10 pages with same missing header
    const duplicatedHeaders = Array.from({ length: 10 }, (_, i) => ({
      id: `header-${i}`,
      kind: 'header',
      details: { name: 'permissions-policy' }
    }));

    const prisma = createPrisma(duplicatedHeaders) as unknown as PrismaClient;
    const result = await computeScore(prisma, 'scan');

    // Should only count once (-3 points), not 10 times (-30 points)
    // Score: 100 - 3 (header) - 5 (no policy) + 5 (no trackers) = 97
    expect(result.score).toBe(97);
    expect(result.explanations.filter(e => e.reason === 'Missing security header').length).toBe(1);
  });

  it('does not penalize first-party CDNs (FIX #2)', async () => {
    const scan = { input: 'github.com', normalizedInput: 'https://github.com' };
    const prisma = createPrisma([
      { id: '1', kind: 'thirdparty', details: { domain: 'github.githubassets.com' } },
      { id: '2', kind: 'thirdparty', details: { domain: 'githubusercontent.com' } },
      { id: '3', kind: 'thirdparty', details: { domain: 'google-analytics.com' } }, // actual third-party
    ], scan) as unknown as PrismaClient;

    const result = await computeScore(prisma, 'scan');

    // Should only penalize google-analytics.com (-2 points), not GitHub's own CDNs
    // Score: 100 - 2 (third-party) - 5 (no policy) + 5 (no trackers) = 98
    expect(result.score).toBe(98);
  });

  it('rewards sites with strong security (FIX #3)', async () => {
    const prisma = createPrisma([
      { id: 'tls', kind: 'tls', details: { grade: 'A+' } },
      { id: 'policy', kind: 'policy', details: { found: true } },
    ]) as unknown as PrismaClient;

    const result = await computeScore(prisma, 'scan');

    // Score: 100 + 5 (A+ TLS) + 3 (policy found) + 5 (no trackers) = 113 → capped at 100
    expect(result.score).toBe(100);
    expect(result.explanations.some(e => e.reason === 'TLS Grade A+ (excellent)')).toBe(true);
    expect(result.explanations.some(e => e.reason === 'Privacy policy found')).toBe(true);
  });

  it('filters out mixed content false positives (FIX #4)', async () => {
    const prisma = createPrisma([
      { id: '1', kind: 'insecure', details: { url: 'null' } }, // false positive
      { id: '2', kind: 'insecure', details: { url: '' } }, // false positive
      { id: '3', kind: 'insecure', details: { url: 'http://example.com/image.png' } }, // actual issue
    ]) as unknown as PrismaClient;

    const result = await computeScore(prisma, 'scan');

    // Should only count the actual HTTP resource (-10 points)
    // Score: 100 - 10 (insecure) - 5 (no policy) + 5 (no trackers) = 90
    expect(result.score).toBe(90);
    expect(result.issues.some(issue => issue.key === 'security.mixed-content')).toBe(true);
  });

  it('only penalizes fingerprinting if 3+ signals detected (FIX #5)', async () => {
    // Test with 2 signals (should NOT penalize - likely feature detection)
    const prismaWith2Signals = createPrisma([
      { id: '1', kind: 'fingerprint', details: { signal: 'screen.width' } },
      { id: '2', kind: 'fingerprint', details: { signal: 'navigator.platform' } },
    ]) as unknown as PrismaClient;

    const resultWith2 = await computeScore(prismaWith2Signals, 'scan');
    // Score: 100 - 5 (no policy) + 5 (no trackers) = 100
    expect(resultWith2.score).toBe(100);
    expect(resultWith2.issues.some(issue => issue.key === 'tracking.fingerprinting')).toBe(false);

    // Test with 3 signals (should penalize - actual fingerprinting)
    const prismaWith3Signals = createPrisma([
      { id: '1', kind: 'fingerprint', details: { signal: 'screen.width' } },
      { id: '2', kind: 'fingerprint', details: { signal: 'navigator.platform' } },
      { id: '3', kind: 'fingerprint', details: { signal: 'canvas.fingerprint' } },
    ]) as unknown as PrismaClient;

    const resultWith3 = await computeScore(prismaWith3Signals, 'scan');
    // Score: 100 - 5 (fingerprinting) - 5 (no policy) + 5 (no trackers) = 95
    expect(resultWith3.score).toBe(95);
    expect(resultWith3.issues.some(issue => issue.key === 'tracking.fingerprinting')).toBe(true);
  });
});
