import { etldPlusOne } from './utils.js';

export type ReportIssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

const severityRank: Record<ReportIssueSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export interface ScanEntity {
  id: string;
  input: string;
  normalizedInput?: string | null;
  slug?: string | null;
  status: string;
  score?: number | null;
  label?: string | null;
  summary?: string | null;
  meta?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
  finishedAt?: Date | null;
  [key: string]: unknown;
}

export interface IssueEntity {
  id: string;
  scanId: string;
  key: string | null;
  severity: ReportIssueSeverity | string;
  category: string;
  title: string;
  summary: string | null;
  howToFix: string | null;
  whyItMatters: string | null;
  references: unknown;
  sortWeight: number | null;
  createdAt?: Date;
}

export interface EvidenceEntity {
  id: string;
  scanId: string;
  kind: string;
  severity: number;
  title: string;
  details: unknown;
  createdAt?: Date;
}

export interface ReportTopFix {
  id: string;
  key: string;
  title: string;
  category: string;
  severity: ReportIssueSeverity | string;
  whyItMatters: string | null;
  howToFix: string | null;
  references: Array<{ label?: string; url: string }>;
}

export interface ReportIssue {
  id: string;
  key: string;
  category: string;
  severity: ReportIssueSeverity | string;
  title: string;
  summary: string | null;
  howToFix: string | null;
  whyItMatters: string | null;
  references: Array<{ label?: string; url: string }>;
  sortWeight: number | null;
}

export interface ReportEvidence {
  id: string;
  scanId: string;
  kind: string;
  severity: number;
  title: string;
  details: unknown;
  createdAt?: Date;
}

export interface ReportPayload {
  scan: ScanEntity;
  issues: ReportIssue[];
  evidence: ReportEvidence[];
  topFixes: ReportTopFix[];
  meta: {
    dataSharing: 'None' | 'Low' | 'Medium' | 'High';
    domain: string;
  };
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

function extractDomain(details: unknown): string {
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const record = details as Record<string, unknown>;
    const domain = record.domain;
    if (typeof domain === 'string') return domain;
  }
  return '';
}

export interface BuildReportPayloadOptions {
  evidence: EvidenceEntity[];
  issues: IssueEntity[];
}

export function buildReportPayload(scan: ScanEntity, options: BuildReportPayloadOptions): ReportPayload {
  const issues = options.issues ?? [];
  const evidence = options.evidence ?? [];

  const severityThreshold = severityRank['medium'];

  const topFixes: ReportTopFix[] = issues
    .filter((issue) => severityRank[(issue.severity as ReportIssueSeverity) ?? 'info'] >= severityThreshold)
    .sort((a, b) => {
      const diff = severityRank[(b.severity as ReportIssueSeverity) ?? 'info'] - severityRank[(a.severity as ReportIssueSeverity) ?? 'info'];
      if (diff !== 0) return diff;
      return (a.sortWeight ?? 0) - (b.sortWeight ?? 0);
    })
    .slice(0, 3)
    .map((issue) => ({
      id: issue.id,
      key: issue.key ?? issue.id,
      title: issue.title,
      category: issue.category,
      severity: issue.severity,
      whyItMatters: issue.whyItMatters,
      howToFix: issue.howToFix,
      references: asArray<{ label?: string; url: string }>(issue.references),
    }));

  const formattedIssues: ReportIssue[] = issues.map((issue) => ({
    id: issue.id,
    key: issue.key ?? issue.id,
    category: issue.category,
    severity: issue.severity,
    title: issue.title,
    summary: issue.summary,
    howToFix: issue.howToFix,
    whyItMatters: issue.whyItMatters,
    references: asArray<{ label?: string; url: string }>(issue.references),
    sortWeight: issue.sortWeight,
  }));

  const formattedEvidence: ReportEvidence[] = evidence.map((entry) => ({
    id: entry.id,
    scanId: entry.scanId,
    kind: entry.kind,
    severity: entry.severity,
    title: entry.title,
    details: entry.details,
    createdAt: entry.createdAt,
  }));

  const trackerDomains = new Set(
    evidence
      .filter((entry) => entry.kind === 'tracker')
      .map((entry) => extractDomain(entry.details))
      .filter(Boolean)
  );
  const thirdpartyDomains = new Set(
    evidence
      .filter((entry) => entry.kind === 'thirdparty')
      .map((entry) => extractDomain(entry.details))
      .filter(Boolean)
  );
  const cookieIssues = evidence.filter((entry) => entry.kind === 'cookie').length;
  const dataSharingIndex = trackerDomains.size * 2 + thirdpartyDomains.size + cookieIssues;
  let dataSharing: 'None' | 'Low' | 'Medium' | 'High' = 'None';
  if (dataSharingIndex > 8) dataSharing = 'High';
  else if (dataSharingIndex > 3) dataSharing = 'Medium';
  else if (dataSharingIndex > 0) dataSharing = 'Low';

  const domain = (() => {
    try {
      const parsed = new URL(scan.input);
      return etldPlusOne(parsed.hostname);
    } catch {
      return scan.input;
    }
  })();

  return {
    scan,
    evidence: formattedEvidence,
    issues: formattedIssues,
    topFixes,
    meta: {
      dataSharing,
      domain,
    },
  };
}
