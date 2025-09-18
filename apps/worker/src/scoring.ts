import type { PrismaClient } from '@prisma/client';
import type { ScoreResult } from '@privacy-advisor/shared';
import { labelForScore } from '@privacy-advisor/shared';

const coerceDetail = <T extends object>(value: unknown): T =>
  (typeof value === 'object' && value !== null ? (value as T) : ({} as T));

const isString = (value: unknown): value is string => typeof value === 'string';

interface TrackerDetail {
  domain?: string;
  fingerprinting?: boolean;
}

interface ThirdPartyDetail {
  domain?: string;
}

interface HeaderDetail {
  name?: string;
}

interface TLSDetail {
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
}

export async function computeScore(prisma: PrismaClient, scanId: string): Promise<ScoreResult> {
  const evidence = await prisma.evidence.findMany({ where: { scanId } });
  let score = 100;
  const explanations: { evidenceId: string; points: number; reason: string }[] = [];

  const trackers = evidence.filter((entry) => entry.type === 'tracker');
  const uniqueTrackerDomains = new Set(
    trackers.map((entry) => coerceDetail<TrackerDetail>(entry.details).domain).filter(isString),
  );
  let trackerPenalty = Math.min(uniqueTrackerDomains.size * 5, 40);
  trackers.forEach((entry) => {
    if (coerceDetail<TrackerDetail>(entry.details).fingerprinting) trackerPenalty += 5;
  });
  if (trackerPenalty > 0) {
    trackers.forEach((entry) => explanations.push({ evidenceId: entry.id, points: -5, reason: 'Tracker domain' }));
  }
  score -= trackerPenalty;

  const thirdParty = evidence.filter((entry) => entry.type === 'thirdparty');
  const uniqueThird = new Set(
    thirdParty.map((entry) => coerceDetail<ThirdPartyDetail>(entry.details).domain).filter(isString),
  );
  const thirdPenalty = Math.min(uniqueThird.size * 2, 20);
  if (thirdPenalty) {
    thirdParty.forEach((entry) => explanations.push({ evidenceId: entry.id, points: -2, reason: 'Third-party request' }));
  }
  score -= thirdPenalty;

  const insecure = evidence.filter((entry) => entry.type === 'insecure');
  const insecurePenalty = Math.min(insecure.length * 10, 20);
  if (insecurePenalty) {
    insecure.forEach((entry) => explanations.push({ evidenceId: entry.id, points: -10, reason: 'Insecure/mixed content' }));
  }
  score -= insecurePenalty;

  const headersMissing = evidence
    .filter((entry) => entry.type === 'header')
    .map((entry) => coerceDetail<HeaderDetail>(entry.details).name)
    .filter(isString).length;
  const headerPenalty = headersMissing * 3;
  if (headerPenalty) {
    evidence
      .filter((entry) => entry.type === 'header')
      .forEach((entry) => explanations.push({ evidenceId: entry.id, points: -3, reason: 'Missing security header' }));
  }
  score -= headerPenalty;

  const cookieIssues = evidence.filter((entry) => entry.type === 'cookie');
  const cookiePenalty = Math.min(cookieIssues.length * 2, 10);
  if (cookiePenalty) {
    cookieIssues.forEach((entry) => explanations.push({ evidenceId: entry.id, points: -2, reason: 'Cookie missing flags' }));
  }
  score -= cookiePenalty;

  const policyEntries = evidence.filter((entry) => entry.type === 'policy');
  if (policyEntries.length === 0) {
    score -= 5;
  } else {
    const [firstPolicy] = policyEntries;
    if (firstPolicy) explanations.push({ evidenceId: firstPolicy.id, points: 0, reason: 'Privacy policy found' });
  }

  const tlsEntries = evidence.filter((entry) => entry.type === 'tls');
  const [tlsRecord] = tlsEntries;
  if (tlsRecord) {
    const grade = coerceDetail<TLSDetail>(tlsRecord.details).grade ?? 'A';
    let penalty = 0;
    if (grade === 'C') penalty = 3;
    else if (grade === 'D') penalty = 7;
    else if (grade === 'F') penalty = 12;
    score -= penalty;
    if (penalty) explanations.push({ evidenceId: tlsRecord.id, points: -penalty, reason: `TLS grade ${grade}` });
  }

  const fingerprintEntries = evidence.filter((entry) => entry.type === 'fingerprint');
  if (fingerprintEntries.length > 0) {
    score -= 5;
    const [firstFingerprint] = fingerprintEntries;
    if (firstFingerprint) explanations.push({ evidenceId: firstFingerprint.id, points: -5, reason: 'Fingerprinting heuristics' });
  }

  score = Math.max(0, score);
  const label = labelForScore(score);
  return { score, label, explanations };
}


