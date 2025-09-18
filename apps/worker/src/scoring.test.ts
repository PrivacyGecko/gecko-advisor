import { describe, it, expect } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { computeScore } from './scoring';

type MockEvidence = {
  id: string;
  type: string;
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

  it('returns 100 when no evidence present', async () => {
    const prisma = createPrisma([]) as unknown as PrismaClient;
    const result = await computeScore(prisma, 'scan');
    expect(result.score).toBe(100);
    expect(result.label).toBe('Safe');
  });

  it('applies penalties for trackers and third-party evidence', async () => {
    const prisma = createPrisma([
      { id: 'tracker', type: 'tracker', details: { domain: 'tracker.com' } },
      { id: 'third', type: 'thirdparty', details: { domain: 'other.com' } },
    ]) as unknown as PrismaClient;
    const result = await computeScore(prisma, 'scan');
    expect(result.score).toBeLessThan(100);
    expect(result.explanations.length).toBeGreaterThan(0);
  });
});
