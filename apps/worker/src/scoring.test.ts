import { describe, it, expect } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { computeScore } from './scoring.js';

type MockEvidence = {
  id: string;
  kind: string;
  details: Record<string, unknown>;
};

type MockPrisma = {
  evidence: {
    findMany: (args: { where: { scanId: string } }) => Promise<MockEvidence[]>;
  };
};

describe('computeScore', () => {
  const createPrisma = (records: MockEvidence[]): MockPrisma => ({
    evidence: {
      findMany: async () => records,
    },
  });

  it('returns baseline score and issues when no evidence present', async () => {
    const prisma = createPrisma([]) as unknown as PrismaClient;
    const result = await computeScore(prisma, 'scan');
    expect(result.score).toBe(95);
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
});
