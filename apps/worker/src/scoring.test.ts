import { describe, it, expect, vi } from 'vitest';

// Simple test using a mocked prisma client
const mkPrisma = (evidence: any[]) => ({
  evidence: { findMany: vi.fn().mockResolvedValue(evidence) },
} as any);

import { computeScore } from './scoring';

describe('computeScore', () => {
  it('caps tracker penalty at 40', async () => {
    const ev = Array.from({ length: 20 }).map((_, i) => ({ id: String(i), scanId: 's', type: 'tracker', severity: 3, title: 't', details: { domain: 'd' + i } }));
    // Add a policy to avoid the -5 policy penalty in this focused test
    ev.push({ id: 'p', scanId: 's', type: 'policy', severity: 1, title: 'policy', details: {} } as any);
    const prisma = mkPrisma(ev);
    const res = await computeScore(prisma, 's');
    expect(res.score).toBe(60); // 100-40
  expect(res.label).toBe('Caution');
  });
});
