import type { PrismaClient } from '@prisma/client';
import type { ScoreResult } from '@privacy-advisor/shared';
import { labelForScore } from '@privacy-advisor/shared';

export async function computeScore(prisma: PrismaClient, scanId: string): Promise<ScoreResult> {
  const evidence = await prisma.evidence.findMany({ where: { scanId } });
  let score = 100;
  const explanations: { evidenceId: string; points: number; reason: string }[] = [];

  // Trackers
  const trackers = evidence.filter((e) => e.type === 'tracker');
  const uniqueTrackerDomains = new Set<string>();
  trackers.forEach((e) => uniqueTrackerDomains.add(((e.details as any)?.domain) as string));
  let trackerPenalty = Math.min(uniqueTrackerDomains.size * 5, 40);
  // fingerprinting domains extra -5
  trackers.forEach((e) => {
    if ((e.details as any)?.fingerprinting) trackerPenalty += 5;
  });
  if (trackerPenalty > 0) {
    trackers.forEach((e) => explanations.push({ evidenceId: e.id, points: -5, reason: 'Tracker domain' }));
  }
  score -= trackerPenalty;

  // Third-party calls
  const third = evidence.filter((e) => e.type === 'thirdparty');
  const uniqueThird = new Set<string>();
  third.forEach((e) => uniqueThird.add((e.details as any).domain));
  const thirdPenalty = Math.min(uniqueThird.size * 2, 20);
  if (thirdPenalty) third.forEach((e) => explanations.push({ evidenceId: e.id, points: -2, reason: 'Third-party request' }));
  score -= thirdPenalty;

  // Insecure/mixed content
  const insecure = evidence.filter((e) => e.type === 'insecure');
  const insecurePenalty = Math.min(insecure.length * 10, 20);
  if (insecurePenalty) insecure.forEach((e) => explanations.push({ evidenceId: e.id, points: -10, reason: 'Insecure/mixed content' }));
  score -= insecurePenalty;

  // Missing headers
  const header = evidence.filter((e) => e.type === 'header');
  const headersMissing = header.map((e) => ((e.details as any)?.name as string)).length;
  const headerPenalty = headersMissing * 3;
  if (headerPenalty) header.forEach((e) => explanations.push({ evidenceId: e.id, points: -3, reason: 'Missing security header' }));
  score -= headerPenalty;

  // Cookie issues
  const cookieIssues = evidence.filter((e) => e.type === 'cookie');
  const cookiePenalty = Math.min(cookieIssues.length * 2, 10);
  if (cookiePenalty) cookieIssues.forEach((e) => explanations.push({ evidenceId: e.id, points: -2, reason: 'Cookie missing flags' }));
  score -= cookiePenalty;

  // Policy
  const policy = evidence.filter((e) => e.type === 'policy');
  if (policy.length === 0) {
    score -= 5;
  } else if (policy.length > 0) {
    const p0 = policy[0]!;
    explanations.push({ evidenceId: p0.id, points: 0, reason: 'Privacy policy found' });
  }

  // TLS
  const tls = evidence.filter((e) => e.type === 'tls');
  const tls0 = tls[0];
  if (tls0) {
    const grade = ((tls0.details as any)?.grade as 'A' | 'B' | 'C' | 'D' | 'F') || 'A';
    let p = 0;
    if (grade === 'C') p = 3;
    else if (grade === 'D') p = 7;
    else if (grade === 'F') p = 12;
    score -= p;
    if (p) explanations.push({ evidenceId: tls0.id, points: -p, reason: `TLS grade ${grade}` });
  }

  // Fingerprinting heuristics
  const fp = evidence.filter((e) => e.type === 'fingerprint');
  if (fp.length > 0) {
    score -= 5;
    const f0 = fp[0]!;
    explanations.push({ evidenceId: f0.id, points: -5, reason: 'Fingerprinting heuristics' });
  }

  score = Math.max(0, score);
  const label = labelForScore(score);
  return { score, label, explanations };
}
