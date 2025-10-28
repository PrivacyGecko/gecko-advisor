/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { Evidence, Issue, ReportResponse, TopFix } from '@privacy-advisor/shared';
import { computeDataSharingLevel, type DataSharingLevel } from '../dataSharing';

export type ScoreBand = 'safe' | 'risky' | 'dangerous' | 'unknown';

const SCORE_LABELS: Record<ScoreBand, string> = {
  safe: 'Safe',
  risky: 'Risky',
  dangerous: 'Dangerous',
  unknown: 'Pending',
};

const EVIDENCE_LABELS: Record<Evidence['kind'], string> = {
  tracker: 'Tracker',
  cookie: 'Cookie',
  header: 'Header',
  insecure: 'Insecure',
  thirdparty: 'Third-Party',
  policy: 'Policy',
  tls: 'TLS',
  fingerprint: 'Fingerprint',
  'mixed-content': 'Mixed Content',
};

export type EvidenceView = Evidence & {
  domain?: string;
  displayKind: string;
  url?: string;
};

export type IssueView = Issue;

export type TopFixView = TopFix;

export interface ReportViewModel {
  scanId: string;
  slug: string;
  label: string | null;
  score: number | null;
  scoreBand: ScoreBand;
  scoreLabel: string;
  summary: string | null;
  targetType: string;
  domain: string;
  shareUrl: string;
  shareMessage: string;
  dataSharing: DataSharingLevel;
  topFixes: TopFixView[];
  issues: IssueView[];
  evidence: EvidenceView[];
  stats: {
    trackerCount: number;
    trackerDomains: string[];
    thirdPartyCount: number;
    thirdPartyDomains: string[];
    cookieCount: number;
    insecureCount: number;
    tlsGrade?: string;
    severityCounts: Record<Issue['severity'], number>;
  };
  walletRisk?: string;
  meta: ReportResponse['meta'];
}

const envAppOrigin = (import.meta.env.VITE_STAGE_ORIGIN ?? '').replace(/\/$/, '');

export function toReportView(report: ReportResponse, options: { appOrigin?: string } = {}): ReportViewModel {
  const trackerDomains = collectDomains(report.evidence, 'tracker');
  const thirdPartyDomains = collectDomains(report.evidence, 'thirdparty');
  const cookieCount = report.evidence.filter((item) => item.kind === 'cookie').length;
  const insecureCount = report.evidence.filter((item) => item.kind === 'insecure' || item.kind === 'mixed-content').length;
  const tlsGrade = getTlsGrade(report.evidence);

  const issues: IssueView[] = report.issues;

  const severityCounts: Record<Issue['severity'], number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const issue of issues) {
    severityCounts[issue.severity]++;
  }

  const evidence: EvidenceView[] = report.evidence.map((item) => ({
    ...item,
    displayKind: EVIDENCE_LABELS[item.kind] ?? item.kind,
    domain: getDetailString(item.details, 'domain'),
    url: getDetailString(item.details, 'url'),
  }));

  const topFixes: TopFixView[] = report.topFixes.slice(0, 3);

  const score = typeof report.scan.score === 'number' ? report.scan.score : null;
  const scoreBand = deriveBand(score);
  const domain = resolveDomain(report);
  const dataSharing = ensureDataSharing(report.meta?.dataSharing, trackerDomains.size, thirdPartyDomains.size, cookieCount);

  const basePreference = options.appOrigin ?? envAppOrigin;
  const shareBaseCandidate = basePreference ?? resolveBrowserOrigin();
  const shareBase = shareBaseCandidate ? shareBaseCandidate.replace(/\/$/, '') : undefined;
  const sharePath = `/r/${encodeURIComponent(report.scan.slug)}`;
  const shareUrl = shareBase ? `${shareBase}${sharePath}` : sharePath;
  const shareMessage = report.scan.shareMessage ?? `Privacy scan for ${domain}`;
  const walletRisk = extractWalletRisk(report.scan);

  return {
    scanId: report.scan.id,
    slug: report.scan.slug,
    label: report.scan.label ?? null,
    score,
    scoreBand,
    scoreLabel: SCORE_LABELS[scoreBand],
    summary: report.scan.summary ?? null,
    targetType: report.scan.targetType,
    domain,
    shareUrl,
    shareMessage,
    dataSharing,
    topFixes,
    issues,
    evidence,
    stats: {
      trackerCount: trackerDomains.size,
      trackerDomains: Array.from(trackerDomains),
      thirdPartyCount: thirdPartyDomains.size,
      thirdPartyDomains: Array.from(thirdPartyDomains),
      cookieCount,
      insecureCount,
      tlsGrade,
      severityCounts,
    },
    walletRisk,
    meta: report.meta ?? undefined,
  };
}

function deriveBand(score: number | null): ScoreBand {
  if (typeof score === 'number') {
    if (score >= 80) return 'safe';
    if (score >= 50) return 'risky';
    return 'dangerous';
  }
  return 'unknown';
}

function resolveDomain(report: ReportResponse): string {
  if (report.meta?.domain) return report.meta.domain;
  const candidate = report.scan.normalizedInput ?? report.scan.input ?? '';
  try {
    const parsed = new URL(candidate);
    return parsed.hostname;
  } catch {
    return report.scan.slug;
  }
}

function resolveBrowserOrigin(): string | undefined {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return undefined;
}

function collectDomains(evidence: Evidence[], kind: Evidence['kind']): Set<string> {
  const domains = new Set<string>();
  for (const item of evidence) {
    if (item.kind !== kind) continue;
    const domain = getDetailString(item.details, 'domain');
    if (domain) domains.add(domain);
  }
  return domains;
}

function getDetailString(details: unknown, key: string): string | undefined {
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const value = (details as Record<string, unknown>)[key];
    if (typeof value === 'string') return value;
  }
  return undefined;
}

function getTlsGrade(evidence: Evidence[]): string | undefined {
  const entry = evidence.find((item) => item.kind === 'tls');
  if (!entry) return undefined;
  const grade = getDetailString(entry.details, 'grade');
  if (!grade) return undefined;
  const normalized = grade.toUpperCase();
  if (/^[ABCDF]$/.test(normalized)) return normalized;
  return undefined;
}

function ensureDataSharing(
  value: unknown,
  trackerDomains: number,
  thirdPartyDomains: number,
  cookieCount: number,
): DataSharingLevel {
  if (value === 'None' || value === 'Low' || value === 'Medium' || value === 'High') {
    return value;
  }
  return computeDataSharingLevel(trackerDomains, thirdPartyDomains, cookieCount);
}

function extractWalletRisk(scan: ReportResponse['scan']): string | undefined {
  if (scan.targetType !== 'address') return undefined;
  if (scan.meta && typeof scan.meta === 'object' && !Array.isArray(scan.meta)) {
    const value = (scan.meta as Record<string, unknown>).walletRisk;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return 'None';
}
