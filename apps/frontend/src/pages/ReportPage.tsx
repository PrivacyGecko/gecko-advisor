/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { reportQueryOptions } from '../lib/api';
import EnhancedScoreDial from '../components/EnhancedScoreDial';
import Card from '../components/Card';
import CopyButton from '../components/CopyButton';
import InfoPopover from '../components/InfoPopover';
import { SeverityIndicator } from '../components/SeverityBadge';
import VirtualizedEvidenceList from '../components/VirtualizedEvidenceList';
import { ScoreDialSkeleton, CardSkeleton, EvidenceCardSkeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorBoundary';
import Footer from '../components/Footer';
import type { LegacyReportResponse } from '@privacy-advisor/shared';
import { computeDataSharingLevel, type DataSharingLevel } from '../lib/dataSharing';
import { useAuth } from '../contexts/AuthContext';

type EvidenceItem = LegacyReportResponse['evidence'][number];
type EvidenceType = EvidenceItem['type'];
type SeverityFilter = 'all' | 'high' | 'medium' | 'low';

/**
 * Maps evidence type to human-readable category label
 */
const getCategoryLabel = (type: string | undefined): string => {
  if (!type || type === 'undefined' || type === 'unknown') return 'Security & Privacy';

  const labels: Record<string, string> = {
    'tracker': 'Tracking & Analytics',
    'thirdparty': 'Third-Party Connections',
    'cookie': 'Cookies & Storage',
    'header': 'Security Headers',
    'insecure': 'Security Issues',
    'fingerprint': 'Fingerprinting',
    'policy': 'Privacy Policy',
    'tls': 'Encryption & TLS',
    'mixed-content': 'Mixed Content',
  };

  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

type Tip = { text: string; url?: string };
const TIPS: Record<EvidenceType, Tip[]> = {
  tracker: [
    { text: 'Remove or self-host analytics where possible.' },
    {
      text: 'Use Consent Mode or server-side analytics with IP anonymization.',
      url: 'https://developers.google.com/tag-platform/security/guides/consent',
    },
  ],
  thirdparty: [
    { text: 'Audit third-party scripts and remove unused vendors.' },
    {
      text: 'Use Subresource Integrity (SRI) when loading from CDNs.',
      url: 'https://developer.mozilla.org/docs/Web/Security/Subresource_Integrity',
    },
    {
      text: 'Enforce strict CSP for scripts and connections.',
      url: 'https://developer.mozilla.org/docs/Web/HTTP/CSP',
    },
  ],
  cookie: [
    {
      text: 'Set Secure and SameSite attributes for all cookies.',
      url: 'https://developer.mozilla.org/docs/Web/HTTP/Cookies#security',
    },
    { text: 'Avoid setting cookies on non-HTTPS origins.' },
  ],
  header: [
    {
      text: 'Add CSP, Referrer-Policy, HSTS, X-Content-Type-Options, Permissions-Policy.',
      url: 'https://owasp.org/www-project-secure-headers/',
    },
  ],
  insecure: [
    {
      text: 'Serve all resources over HTTPS and avoid mixed content.',
      url: 'https://developer.mozilla.org/docs/Web/Security/Mixed_content',
    },
  ],
  tls: [
    {
      text: 'Use modern TLS config (A grade), disable weak ciphers.',
      url: 'https://ssl-config.mozilla.org/',
    },
  ],
  policy: [{ text: 'Add a clear Privacy Policy link on the homepage.' }],
  fingerprint: [
    {
      text: 'Avoid fingerprinting techniques (canvas/audio/plugins access).',
      url: 'https://privacyguides.org/en/advanced/browser-fingerprinting/',
    },
  ],
  'mixed-content': [
    {
      text: 'Ensure all resources are loaded over HTTPS to prevent mixed content warnings.',
      url: 'https://developer.mozilla.org/docs/Web/Security/Mixed_content',
    },
  ],
};

const severityOptions: { key: SeverityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Med' },
  { key: 'low', label: 'Low' },
];

const toSeverityFilter = (value: string | null): SeverityFilter => {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'all';
};

const isDataSharingLevel = (value: unknown): value is DataSharingLevel =>
  value === 'None' || value === 'Low' || value === 'Medium' || value === 'High';

const getDetailString = (details: unknown, key: string): string => {
  if (typeof details === 'object' && details !== null) {
    const value = (details as Record<string, unknown>)[key];
    if (typeof value === 'string') return value;
  }
  return '';
};

const getTlsGrade = (details: unknown): 'A' | 'B' | 'C' | 'D' | 'F' | undefined => {
  if (typeof details === 'object' && details !== null) {
    const grade = (details as Record<string, unknown>).grade;
    if (grade === 'A' || grade === 'B' || grade === 'C' || grade === 'D' || grade === 'F') return grade;
  }
  return undefined;
};

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/**
 * Sanitizes evidence data before client exposure
 * Removes internal fields and sensitive information
 */
const sanitizeEvidence = (evidence: EvidenceItem[]): EvidenceItem[] => {
  return evidence.map(item => {
    // Create a safe copy with only public fields
    const sanitized: EvidenceItem = {
      id: item.id,
      scanId: item.scanId,
      type: item.type,
      title: item.title,
      severity: item.severity,
      details: sanitizeDetails(item.details),
      createdAt: item.createdAt
    };

    return sanitized;
  });
};

/**
 * Sanitizes details object to remove sensitive internal data
 */
const sanitizeDetails = (details: unknown): unknown => {
  if (typeof details !== 'object' || details === null) {
    return details;
  }

  const sanitized = { ...details as Record<string, unknown> };

  // Remove internal/sensitive fields
  const internalFields = [
    '_internal',
    'rawData',
    'scannerMeta',
    'debugInfo',
    'internalId',
    'systemInfo',
    'processInfo'
  ];

  internalFields.forEach(field => {
    delete sanitized[field];
  });

  // Sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeDetails(sanitized[key]);
    }
  });

  return sanitized;
};

const shareCurrentUrl = async () => {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  if (!url) return;
  if (navigator.share) {
    try {
      await navigator.share({ url });
      toast.success('Link shared successfully!');
      return;
    } catch {
      /* ignore to fall back */
    }
  }
  try {
    await navigator.clipboard?.writeText(url);
    toast.success('Link copied to clipboard!');
  } catch {
    toast.error('Failed to copy link');
  }
};

const copyCurrentUrl = async () => {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  if (!url) return;
  try {
    await navigator.clipboard?.writeText(url);
    toast.success('Link copied to clipboard!');
  } catch {
    toast.error('Failed to copy link');
  }
};

export default function ReportPage() {
  const { slug = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery(reportQueryOptions(slug));
  const { user } = useAuth();
  const isPro = user?.subscription === 'PRO' || user?.subscription === 'TEAM';

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (isError || !data) {
    // Determine the type of error for better user messaging
    const isSchemaError = error?.message?.includes('validation') || error?.name === 'ZodError';
    const is404Error = error?.message?.includes('Report not found');

    const errorTitle = isSchemaError
      ? "Report Data Error"
      : is404Error
      ? "Report Not Found"
      : "Failed to Load Report";

    const errorDescription = isSchemaError
      ? `The report data for "${slug}" could not be processed correctly. This might be due to a data format issue. Our team has been notified.`
      : is404Error
      ? `The report with ID "${slug}" could not be found. It may have been removed or the link might be incorrect.`
      : `There was an error loading the report "${slug}". This might be a temporary issue. Please try again.`;

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-security-blue hover:text-security-blue-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-security-blue focus-visible:ring-offset-2 rounded"
            aria-label="Back to home"
          >
            <span aria-hidden="true">&larr;</span>
            Home
          </Link>
        </div>

        <ErrorState
          error={error || new Error('Report not found')}
          title={errorTitle}
          description={errorDescription}
          onRetry={() => refetch()}
          onGoHome={() => window.location.href = '/'}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      </div>
    );
  }

  return <ReportBody slug={slug} data={data} isPro={isPro} />;
}

/**
 * Loading skeleton for the report page
 */
function ReportSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardSkeleton className="w-20 h-8" />
      </div>

      {/* Title and score skeleton */}
      <header className="flex items-center gap-4">
        <ScoreDialSkeleton size="md" />
        <div className="space-y-2 flex-1">
          <CardSkeleton className="h-8 w-80" />
          <CardSkeleton className="h-5 w-64" />
          <CardSkeleton className="h-4 w-96" />
        </div>
        <div className="space-x-2">
          <CardSkeleton className="w-20 h-8 inline-block" />
          <CardSkeleton className="w-24 h-8 inline-block" />
          <CardSkeleton className="w-12 h-8 inline-block" />
        </div>
      </header>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <CardSkeleton key={i} className="w-16 h-8" />
        ))}
      </div>

      {/* Evidence sections skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <EvidenceCardSkeleton key={i} showExpandedContent={i === 0} />
        ))}
      </div>
    </div>
  );
}

function ReportBody({ slug, data, isPro }: { slug: string; data: LegacyReportResponse; isPro: boolean }) {
  const { scan, evidence, meta } = data;

  const trackerDomains = React.useMemo(() => {
    const domains = new Set<string>();
    evidence.filter((item) => item.type === 'tracker').forEach((item) => {
      const domain = getDetailString(item.details, 'domain');
      if (domain) domains.add(domain);
    });
    return Array.from(domains);
  }, [evidence]);

  const thirdpartyDomains = React.useMemo(() => {
    const domains = new Set<string>();
    evidence.filter((item) => item.type === 'thirdparty').forEach((item) => {
      const domain = getDetailString(item.details, 'domain');
      if (domain) domains.add(domain);
    });
    return Array.from(domains);
  }, [evidence]);

  const cookieIssues = evidence.filter((item) => item.type === 'cookie').length;
  const insecureCount = evidence.filter((item) => item.type === 'insecure').length;
  const tlsGrade = getTlsGrade(evidence.find((item) => item.type === 'tls')?.details);

  const dataSharingLevel = React.useMemo((): DataSharingLevel => {
    if (isDataSharingLevel(meta?.dataSharing)) return meta.dataSharing;
    return computeDataSharingLevel(trackerDomains.length, thirdpartyDomains.length, cookieIssues);
  }, [cookieIssues, meta?.dataSharing, thirdpartyDomains.length, trackerDomains.length]);

  const groups = React.useMemo(() => {
    const acc: Partial<Record<EvidenceType, EvidenceItem[]>> = {};
    evidence.forEach((item) => {
      const type = item.type as EvidenceType;
      (acc[type] ??= []).push(item);
    });
    return acc;
  }, [evidence]);

  const groupEntries = React.useMemo(() => Object.entries(groups) as [EvidenceType, EvidenceItem[]][], [groups]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [sevFilter, setSevFilter] = React.useState<SeverityFilter>(() => toSeverityFilter(searchParams.get('sev')));

  React.useEffect(() => {
    const expected = sevFilter === 'all' ? null : sevFilter;
    const current = searchParams.get('sev');
    if (expected !== current) {
      const next = new URLSearchParams(searchParams);
      if (expected === null) next.delete('sev');
      else next.set('sev', expected);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, sevFilter]);

  const [open, setOpen] = React.useState<Record<EvidenceType, boolean>>({} as Record<EvidenceType, boolean>);

  React.useEffect(() => {
    setOpen((previous) => {
      const next: Record<EvidenceType, boolean> = { ...previous };

      groupEntries.forEach(([type, items]) => {
        if (next[type] === undefined) {
          // Smart default: Only expand sections with high-severity items (severity >= 4)
          const hasHighSeverity = items.some(item => item.severity >= 4);
          next[type] = hasHighSeverity;
        }
      });

      return next;
    });
  }, [groupEntries]);

  const matchesFilter = React.useCallback(
    (severity: number) => {
      if (sevFilter === 'all') return true;
      if (sevFilter === 'high') return severity >= 4;
      if (sevFilter === 'medium') return severity === 3;
      return severity <= 2;
    },
    [sevFilter],
  );

  const toggle = React.useCallback((type: EvidenceType) => {
    setOpen((previous) => ({ ...previous, [type]: !previous[type] }));
  }, []);

  const sectionId = (type: EvidenceType) => `section-${type}`;

  const exportJson = React.useCallback(() => {
    const filtered = evidence.filter((item) => matchesFilter(item.severity));

    // Sanitize evidence before export to prevent data leakage
    const sanitizedEvidence = sanitizeEvidence(filtered);

    const payload = {
      scan: {
        id: scan.id,
        input: scan.input,
        score: scan.score,
        label: scan.label,
        slug
      },
      filter: sevFilter,
      exportedAt: new Date().toISOString(),
      evidence: sanitizedEvidence,
      metadata: {
        version: '1.0',
        format: 'privacy-advisor-report',
        sanitized: true
      }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `privacy-report-${slug}-${sevFilter}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [evidence, matchesFilter, scan.id, scan.input, scan.label, scan.score, sevFilter, slug]);

  const sslStatus = React.useMemo((): 'Valid' | 'Weak' | 'Invalid' => {
    if (insecureCount > 0) return 'Invalid';
    if (tlsGrade && (tlsGrade === 'D' || tlsGrade === 'F' || tlsGrade === 'C')) return 'Weak';
    return 'Valid';
  }, [insecureCount, tlsGrade]);

  const topTrackers = trackerDomains.slice(0, 2);

  return (
    <>
      {/* Mobile sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm md:hidden">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link
              to="/"
              className="text-security-blue hover:text-security-blue-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-security-blue rounded p-1"
              aria-label="Back to home"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{scan.input}</div>
              <div className="text-xs text-gray-500">
                {scan.label} ({scan.score}%)
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold
              ${(scan.score ?? 0) >= 70 ? 'bg-green-100 text-green-700' :
                (scan.score ?? 0) >= 40 ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'}
            `}>
              {scan.score ?? 0}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-security-blue hover:text-security-blue-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-security-blue focus-visible:ring-offset-2 rounded"
            aria-label="Back to home"
          >
            <span aria-hidden="true">&larr;</span>
            Home
          </Link>
        </div>
      <header className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-shrink-0 mx-auto md:mx-0">
          <EnhancedScoreDial score={scan.score ?? 0} size="lg" label={scan.label ?? undefined} />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold">
            {scan.label} ({scan.score ?? 'n/a'})
          </h1>
          <p className="text-slate-600 break-all">{scan.input}</p>
          <div className="mt-1 text-xs text-slate-600">
            Score legend: <span className="text-green-700 font-medium">Safe &gt;= 70</span> • <span className="text-amber-700 font-medium">Caution 40-69</span> • <span className="text-red-700 font-medium">High Risk &lt; 40</span>{' '}
            <a href="/docs#scoring" className="underline text-security-blue">Learn more</a>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center md:justify-end">
          <CopyButton text={typeof window !== 'undefined' ? window.location.href : ''} />
          <button onClick={exportJson} className="px-3 py-3 min-h-[44px] rounded border text-sm">
            Export JSON
          </button>
          <a href="/docs" className="text-sm underline text-security-blue min-h-[44px] flex items-center">
            Docs
          </a>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <div className="text-xs text-slate-500 inline-flex items-center gap-2">
            <InfoPopover label="Score">Deterministic deductions from 100</InfoPopover>
          </div>
          <div className="mt-2 text-2xl font-semibold">{scan.score ?? 0}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500 inline-flex items-center gap-2">
            Data Sharing Risk
            <InfoPopover label="Data Sharing Risk">
              Indicates the level of data sharing based on trackers, third-party connections, and cookies. Lower is better.
            </InfoPopover>
          </div>
          <div className={`mt-2 text-2xl font-semibold ${
            dataSharingLevel === 'None' ? 'text-green-700' :
            dataSharingLevel === 'Low' ? 'text-green-600' :
            dataSharingLevel === 'Medium' ? 'text-amber-600' :
            'text-red-600'
          }`}>
            {dataSharingLevel}
          </div>
          <div className="text-xs text-slate-600">
            <span className="sr-only">Breakdown: </span>
            Trackers: {trackerDomains.length}
            <span className="mx-1 text-slate-400" aria-hidden="true">•</span>
            Third-party: {thirdpartyDomains.length}
            <span className="mx-1 text-slate-400" aria-hidden="true">•</span>
            Cookies: {cookieIssues}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">TLS/HTTPS</div>
          <div className="mt-2 text-2xl font-semibold">{sslStatus}</div>
          <div className="text-xs text-slate-600">
            {tlsGrade ? `TLS grade: ${tlsGrade}` : 'TLS grade: Not rated'}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">Top trackers</div>
          <div className="mt-2 text-sm text-slate-700">
            {topTrackers.length > 0 ? topTrackers.join(', ') : 'None detected'}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm" role="tablist" aria-label="Severity filter (1 All, 2 High, 3 Med, 4 Low)">
        {severityOptions.map((option) => (
          <button
            key={option.key}
            role="tab"
            aria-selected={sevFilter === option.key}
            className={`px-3 py-3 min-h-[44px] rounded-full border ${sevFilter === option.key ? 'bg-security-blue text-white' : 'bg-white'}`}
            onClick={() => setSevFilter(option.key)}
          >
            {option.label}
          </button>
        ))}
        <span className="text-xs text-slate-500 hidden sm:inline">
          <span className="sr-only">Keyboard shortcuts: </span>
          Keys: 1=All, 2=High, 3=Med, 4=Low
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-700">
        {groupEntries.map(([type, list]) => {
          const high = list.filter((item) => item.severity >= 4).length;
          const medium = list.filter((item) => item.severity === 3).length;
          const low = list.filter((item) => item.severity <= 2).length;
          return (
            <a
              key={type}
              href={`#${sectionId(type)}`}
              className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-security-blue"
              aria-label={`${getCategoryLabel(type)} ${list.length} items: ${high} high, ${medium} medium, ${low} low`}
            >
              <span>{getCategoryLabel(type)}</span>
              <span className="ml-1 font-semibold">{list.length}</span>
              <span className="ml-2 inline-flex items-center gap-1">
                <span
                  className="px-1 rounded-full text-2xs font-medium bg-privacy-danger-100 text-privacy-danger-800 border border-privacy-danger-300"
                  title="High severity issues"
                  role="status"
                  aria-label={`${high} high severity issues`}
                >
                  <span aria-hidden="true">⚠️</span> {high}
                </span>
                <span
                  className="px-1 rounded-full text-2xs font-medium bg-privacy-caution-100 text-privacy-caution-800 border border-privacy-caution-300"
                  title="Medium severity issues"
                  role="status"
                  aria-label={`${medium} medium severity issues`}
                >
                  <span aria-hidden="true">⚡</span> {medium}
                </span>
                <span
                  className="px-1 rounded-full text-2xs font-medium bg-slate-100 text-slate-700 border border-slate-300"
                  title="Low severity issues"
                  role="status"
                  aria-label={`${low} low severity issues`}
                >
                  <span aria-hidden="true">ℹ️</span> {low}
                </span>
              </span>
            </a>
          );
        })}
      </div>

      {/* Evidence section controls */}
      <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">
            {groupEntries.filter(([type]) => open[type]).length}
          </span>
          {' of '}
          <span className="font-medium text-slate-900">
            {groupEntries.length}
          </span>
          {' categories visible'}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const allOpen: Record<EvidenceType, boolean> = {} as Record<EvidenceType, boolean>;
              groupEntries.forEach(([type]) => { allOpen[type] = true; });
              setOpen(allOpen);
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-security-blue hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
            aria-label="Expand all evidence categories"
          >
            Expand all
          </button>

          <div className="w-px h-4 bg-slate-300" />

          <button
            onClick={() => {
              const allClosed: Record<EvidenceType, boolean> = {} as Record<EvidenceType, boolean>;
              groupEntries.forEach(([type]) => { allClosed[type] = false; });
              setOpen(allClosed);
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-300 transition-colors"
            aria-label="Collapse all evidence categories"
          >
            Collapse all
          </button>
        </div>
      </div>

      {groupEntries.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-gray-900 font-semibold mb-2">
              No privacy issues found
            </p>
            <p className="text-sm text-gray-600">
              This site appears to have excellent privacy practices.
            </p>
          </div>
        </Card>
      ) : (
        groupEntries.map(([type, list]) => {
          const filteredItems = list.filter((item) => matchesFilter(item.severity));
          const hasFilteredItems = filteredItems.length > 0;

          return (
            <Card key={type}>
              <button
                className="w-full flex items-center justify-between py-3 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-security-blue rounded transition-colors duration-150 hover:bg-slate-50"
                aria-expanded={open[type] ? 'true' : 'false'}
                aria-controls={sectionId(type)}
                onClick={() => toggle(type)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <h2 className="font-semibold text-lg text-slate-900">
                    {getCategoryLabel(type)}
                  </h2>

                  {!open[type] && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                      {list.length} item{list.length !== 1 ? 's' : ''} collapsed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Severity distribution (visible when collapsed or always on desktop) */}
                  <div className={`${open[type] ? 'hidden sm:flex' : 'flex'} items-center gap-2`}>
                    {(() => {
                      const highCount = list.filter(item => item.severity >= 4).length;
                      const mediumCount = list.filter(item => item.severity === 3).length;
                      const lowCount = list.filter(item => item.severity <= 2).length;

                      return (
                        <>
                          {highCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 border border-red-200 text-xs font-bold"
                              title={`${highCount} high severity issue${highCount !== 1 ? 's' : ''}`}
                            >
                              <span className="text-base">⚠️</span>
                              <span className="text-red-700">{highCount}</span>
                            </span>
                          )}
                          {mediumCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 border border-amber-200 text-xs font-bold"
                              title={`${mediumCount} medium severity issue${mediumCount !== 1 ? 's' : ''}`}
                            >
                              <span className="text-base">⚡</span>
                              <span className="text-amber-700">{mediumCount}</span>
                            </span>
                          )}
                          {lowCount > 0 && !open[type] && (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold"
                              title={`${lowCount} low severity issue${lowCount !== 1 ? 's' : ''}`}
                            >
                              <span className="text-base">ℹ️</span>
                              <span className="text-slate-700">{lowCount}</span>
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Expand/Collapse icon with rotation animation */}
                  <svg
                    className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${open[type] ? 'rotate-180' : 'rotate-0'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>
              {open[type] && (
                <>
                  {!hasFilteredItems ? (
                    <div className="text-center py-8 mt-2 border-t">
                      <div className="text-3xl mb-3">✅</div>
                      <p className="text-gray-600 mb-2">
                        No {sevFilter !== 'all' ? sevFilter + ' severity' : ''} issues found in this category.
                      </p>
                      <p className="text-sm text-gray-500">
                        {sevFilter !== 'all' ? 'Try viewing other severity levels or select "All".' : 'This is a good sign!'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Use virtualized list for large evidence collections (>20 items) */}
                      {list.length > 20 ? (
                        <div className="mt-2">
                          <VirtualizedEvidenceList
                            items={list}
                            matchesFilter={matchesFilter}
                            sanitizeDetails={sanitizeDetails}
                            containerHeight={300}
                            itemHeight={80}
                            className="border rounded"
                          />
                        </div>
                      ) : (
                        <ul id={sectionId(type)} className="text-sm text-slate-700 space-y-1 mt-2">
                          {filteredItems.map((item) => (
                            <li key={item.id} className="flex items-start gap-3">
                              <SeverityIndicator severity={item.severity} />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900">{item.title}</div>
                                <details className="mt-1 group">
                                  <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-security-blue focus:ring-offset-1 rounded py-3 min-h-[44px] inline-flex items-center">
                                    <span className="group-open:hidden">Show details</span>
                                    <span className="hidden group-open:inline">Hide details</span>
                                  </summary>
                                  <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 border">
                                    <div className="font-mono text-2xs break-all">
                                      {safeStringify(sanitizeDetails(item.details))}
                                    </div>
                                  </div>
                                </details>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                  {TIPS[type] && hasFilteredItems && (
                    <div className="mt-3 text-sm">
                      <div className="font-semibold">How to fix</div>
                      <ul className="list-disc pl-5 text-slate-700">
                        {TIPS[type].map((tip, index) => (
                          <li key={index}>
                            {tip.url ? (
                              <a className="text-security-blue underline" href={tip.url} target="_blank" rel="noreferrer">
                                {tip.text}
                              </a>
                            ) : (
                              tip.text
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </Card>
          );
        })
      )}

      <footer className="text-xs text-slate-500 space-y-1">
        <div>Sources: EasyPrivacy (server-side; attribution), WhoTracks.me (CC BY 4.0), Public Suffix List</div>
        <div>
          Share: <button className="underline text-security-blue" onClick={shareCurrentUrl}>Copy / Share Link</button>
          {' - '}
          <button className="underline text-security-blue" onClick={copyCurrentUrl}>Save Result</button>
          {' - '}
          <a className="underline text-security-blue" href={`/compare?left=${encodeURIComponent(slug)}`}>Compare</a>
        </div>
      </footer>
      <Footer />
      </div>
    </>
  );
}
