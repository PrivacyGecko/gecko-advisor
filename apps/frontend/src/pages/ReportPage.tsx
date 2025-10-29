/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
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
import VirtualizedEvidenceList from '../components/VirtualizedEvidenceList';
import { ScoreDialSkeleton, CardSkeleton, EvidenceCardSkeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorBoundary';
import Footer from '../components/Footer';
import GradeBadge from '../components/GradeBadge';
import type { ReportResponse } from '@gecko-advisor/shared';
import { computeDataSharingLevel, type DataSharingLevel } from '../lib/dataSharing';
import { useAuth } from '../contexts/AuthContext';

type EvidenceItem = ReportResponse['evidence'][number];
type EvidenceType = EvidenceItem['kind'];
type SeverityFilter = 'all' | 'high' | 'medium' | 'low';

/**
 * Enhanced evidence categorization for better information architecture
 */
interface EvidenceCategory {
  title: string;
  icon: string;
  items: EvidenceItem[];
  description: string;
}

/**
 * Categorizes evidence into semantic groups for better UX
 */
function categorizeEvidence(evidence: EvidenceItem[]): Record<string, EvidenceCategory> {
  const categories: Record<string, EvidenceCategory> = {
    tracking: {
      title: 'Tracking & Privacy',
      icon: '🎯',
      items: [],
      description: 'Data collection, tracking, and privacy concerns'
    },
    security: {
      title: 'Security',
      icon: '🔒',
      items: [],
      description: 'Security headers, encryption, and vulnerabilities'
    },
    other: {
      title: 'Other Findings',
      icon: '📋',
      items: [],
      description: 'Additional issues and recommendations'
    }
  };

  evidence.forEach(item => {
    const lowerTitle = item.title?.toLowerCase() || '';
    const lowerType = item.kind?.toLowerCase() || '';

    // Tracking & Privacy category
    if (
      lowerType === 'tracker' ||
      lowerType === 'cookie' ||
      lowerType === 'thirdparty' ||
      lowerType === 'fingerprint' ||
      lowerType === 'policy' ||
      lowerTitle.includes('tracker') ||
      lowerTitle.includes('cookie') ||
      lowerTitle.includes('third-party') ||
      lowerTitle.includes('data sharing') ||
      lowerTitle.includes('fingerprint')
    ) {
      if (categories.tracking) categories.tracking.items.push(item);
    }
    // Security category
    else if (
      lowerType === 'tls' ||
      lowerType === 'header' ||
      lowerType === 'insecure' ||
      lowerType === 'mixed-content' ||
      lowerTitle.includes('tls') ||
      lowerTitle.includes('https') ||
      lowerTitle.includes('security') ||
      lowerTitle.includes('header') ||
      lowerTitle.includes('mixed content') ||
      lowerTitle.includes('encryption')
    ) {
      if (categories.security) categories.security.items.push(item);
    }
    // Other
    else {
      if (categories.other) categories.other.items.push(item);
    }
  });

  return categories;
}

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
 * Generates a human-readable summary of the scan results
 * Based on score, tracker count, and evidence count
 */
const generateSummary = (scan: ReportResponse['scan'], evidence: EvidenceItem[]): string => {
  const score = scan.score ?? 0;
  const evidenceCount = evidence.length;
  const trackerCount = evidence.filter(e =>
    e.kind === 'tracker' || e.title?.toLowerCase().includes('tracker')
  ).length;

  if (score >= 90) {
    return `This site has excellent privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected and strong security measures. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
  } else if (score >= 80) {
    return `This site has good privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected. Some minor improvements possible. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
  } else if (score >= 70) {
    return `This site has fair privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected. Several areas need attention. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
  } else if (score >= 60) {
    return `This site has concerning privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected. Many improvements needed. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
  } else {
    return `This site has poor privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected. Significant privacy risks found. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
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
      kind: item.kind,
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

/**
 * Enhanced evidence item component with complete color coding
 */
interface EvidenceItemDisplayProps {
  evidence: EvidenceItem;
}

function EvidenceItemDisplay({ evidence }: EvidenceItemDisplayProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  // Determine status based on severity
  const getStatusClass = (severity: number): 'good' | 'warning' | 'bad' => {
    if (severity >= 4) return 'bad';
    if (severity >= 3) return 'warning';
    return 'good';
  };

  const status = getStatusClass(evidence.severity);

  const statusConfig = {
    good: {
      bg: 'bg-green-50',
      border: 'border-l-4 border-green-500',
      icon: '✅',
      iconColor: 'text-green-600',
      textColor: 'text-green-900'
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-l-4 border-amber-500',
      icon: '⚠️',
      iconColor: 'text-amber-600',
      textColor: 'text-amber-900'
    },
    bad: {
      bg: 'bg-red-50',
      border: 'border-l-4 border-red-500',
      icon: '❌',
      iconColor: 'text-red-600',
      textColor: 'text-red-900'
    }
  };

  const config = statusConfig[status];

  // Generate "Why this matters" message based on type
  const getWhyItMatters = (type: string): string | null => {
    const messages: Record<string, string> = {
      tracker: 'This tracker can follow your browsing across websites and build profiles about you.',
      cookie: 'Cookies can store personal information and track your behavior across sessions.',
      thirdparty: 'Third-party connections can share your data with external services without your explicit knowledge.',
      fingerprint: 'Fingerprinting techniques can uniquely identify your device even without cookies.',
      insecure: 'Security vulnerabilities can expose your data to attackers and compromise your privacy.',
      header: 'Missing security headers can leave the site vulnerable to various attacks.',
      tls: 'Weak encryption can allow attackers to intercept and read your data.',
      'mixed-content': 'Mixed content warnings indicate resources loaded over insecure connections.',
    };
    return messages[type] || null;
  };

  const whyItMatters = getWhyItMatters(evidence.kind);

  return (
    <div
      className={`${config.bg} ${config.border} rounded-lg p-4 mb-3 transition-all duration-200 hover:shadow-md`}
      data-testid="evidence-item"
      role="article"
      aria-label={`${evidence.title} - Severity ${evidence.severity}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`text-2xl ${config.iconColor} flex-shrink-0`}
          aria-hidden="true"
          role="img"
        >
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className={`font-semibold ${config.textColor} text-base`}>
              {evidence.title}
            </h3>
            <span
              className="text-xs text-gray-600 flex-shrink-0 px-2 py-1 bg-white bg-opacity-50 rounded"
              aria-label={`Severity level ${evidence.severity} out of 5`}
            >
              Severity {evidence.severity}/5
            </span>
          </div>

          {evidence.details && (
            <>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`text-sm font-medium mt-2 focus:outline-none focus:ring-2 focus:ring-security-blue rounded px-2 py-1 transition-colors ${
                  status === 'bad' ? 'text-red-700 hover:text-red-900 hover:bg-red-100' :
                  status === 'warning' ? 'text-amber-700 hover:text-amber-900 hover:bg-amber-100' :
                  'text-green-700 hover:text-green-900 hover:bg-green-100'
                }`}
                aria-expanded={showDetails}
                aria-controls={`details-${evidence.id}`}
              >
                {showDetails ? '▼ Hide details' : '▶ Show details'}
              </button>

              {showDetails && (
                <div
                  id={`details-${evidence.id}`}
                  className="mt-3 p-3 bg-white bg-opacity-70 rounded border border-gray-300 shadow-sm"
                >
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto">
                    {typeof evidence.details === 'string'
                      ? evidence.details
                      : safeStringify(sanitizeDetails(evidence.details))}
                  </pre>
                </div>
              )}
            </>
          )}

          {/* "Why this matters" info box */}
          {whyItMatters && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 flex items-start gap-2">
                <span className="text-lg flex-shrink-0" aria-hidden="true">💡</span>
                <span>
                  <strong className="font-semibold">Why this matters:</strong> {whyItMatters}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
      <main className="max-w-4xl mx-auto p-6">
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
      </main>
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

type BreakdownItem = {
  category: string;
  finding: string;
  points: number;
  positive: boolean;
};

/**
 * Calculates score breakdown based on evidence
 * Shows how points were deducted or awarded
 */
const calculateBreakdown = (scan: ReportResponse['scan'], evidence: EvidenceItem[]): BreakdownItem[] => {
  const breakdown: BreakdownItem[] = [
    {
      category: 'Base Score',
      finding: 'Starting point',
      points: 100,
      positive: true
    }
  ];

  // Analyze evidence for deductions
  const trackers = evidence.filter(e =>
    e.kind === 'tracker' || e.title?.toLowerCase().includes('tracker')
  );

  if (trackers.length > 0) {
    breakdown.push({
      category: 'Trackers',
      finding: `${trackers.length} tracker${trackers.length !== 1 ? 's' : ''} found`,
      points: -Math.min(trackers.length * 5, 30),
      positive: false
    });
  } else {
    breakdown.push({
      category: 'Trackers',
      finding: 'No trackers detected',
      points: 0,
      positive: true
    });
  }

  // HTTPS/TLS check
  const tlsEvidence = evidence.find(e => e.kind === 'tls');
  const hasValidTls = tlsEvidence && tlsEvidence.severity <= 2;
  if (hasValidTls) {
    breakdown.push({
      category: 'HTTPS/TLS',
      finding: 'Valid certificate',
      points: 0,
      positive: true
    });
  } else if (tlsEvidence) {
    breakdown.push({
      category: 'HTTPS/TLS',
      finding: 'TLS configuration issues',
      points: -10,
      positive: false
    });
  }

  // Mixed content
  const hasMixedContent = evidence.some(e =>
    e.kind === 'mixed-content' || (e.title?.toLowerCase().includes('mixed content') && e.severity >= 3)
  );
  if (hasMixedContent) {
    breakdown.push({
      category: 'Mixed Content',
      finding: 'Insecure resources found',
      points: -10,
      positive: false
    });
  }

  // Security headers
  const missingHeaders = evidence.filter(e =>
    e.kind === 'header' && e.severity >= 3
  );
  if (missingHeaders.length > 0) {
    breakdown.push({
      category: 'Security Headers',
      finding: `${missingHeaders.length} missing or weak header${missingHeaders.length !== 1 ? 's' : ''}`,
      points: -Math.min(missingHeaders.length * 3, 15),
      positive: false
    });
  }

  // Third-party connections
  const thirdParty = evidence.filter(e => e.kind === 'thirdparty');
  if (thirdParty.length > 5) {
    breakdown.push({
      category: 'Third-Party',
      finding: `${thirdParty.length} third-party connections`,
      points: -Math.min((thirdParty.length - 5) * 2, 15),
      positive: false
    });
  }

  // Cookies
  const cookies = evidence.filter(e => e.kind === 'cookie' && e.severity >= 3);
  if (cookies.length > 0) {
    breakdown.push({
      category: 'Cookies',
      finding: `${cookies.length} cookie issue${cookies.length !== 1 ? 's' : ''}`,
      points: -Math.min(cookies.length * 3, 12),
      positive: false
    });
  }

  return breakdown;
};

function ReportBody({ slug, data, isPro: _isPro }: { slug: string; data: ReportResponse; isPro: boolean }) {
  const { scan, evidence, meta } = data;
  const [showBreakdown, setShowBreakdown] = React.useState(false);

  const trackerDomains = React.useMemo(() => {
    const domains = new Set<string>();
    evidence.filter((item) => item.kind === 'tracker').forEach((item) => {
      const domain = getDetailString(item.details, 'domain');
      if (domain) domains.add(domain);
    });
    return Array.from(domains);
  }, [evidence]);

  const thirdpartyDomains = React.useMemo(() => {
    const domains = new Set<string>();
    evidence.filter((item) => item.kind === 'thirdparty').forEach((item) => {
      const domain = getDetailString(item.details, 'domain');
      if (domain) domains.add(domain);
    });
    return Array.from(domains);
  }, [evidence]);

  const cookieIssues = evidence.filter((item) => item.kind === 'cookie').length;
  const insecureCount = evidence.filter((item) => item.kind === 'insecure').length;
  const tlsGrade = getTlsGrade(evidence.find((item) => item.kind === 'tls')?.details);

  const dataSharingLevel = React.useMemo((): DataSharingLevel => {
    if (isDataSharingLevel(meta?.dataSharing)) return meta.dataSharing;
    return computeDataSharingLevel(trackerDomains.length, thirdpartyDomains.length, cookieIssues);
  }, [cookieIssues, meta?.dataSharing, thirdpartyDomains.length, trackerDomains.length]);

  const groups = React.useMemo(() => {
    const acc: Partial<Record<EvidenceType, EvidenceItem[]>> = {};
    evidence.forEach((item) => {
      const kind = item.kind as EvidenceType;
      (acc[kind] ??= []).push(item);
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

      groupEntries.forEach(([type]) => {
        if (next[type] === undefined) {
          // QUICK WIN #1: Expand all sections by default for better UX
          // Users come to see findings, not hunt for expand buttons
          next[type] = true; // Old: next[type] = hasHighSeverity;
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

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
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
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Privacy Report: {scan.label}
            </h1>
            <GradeBadge score={scan.score ?? 0} size="lg" showLabel={true} />
          </div>
          <div className="text-lg font-semibold text-gray-700">
            Score: {scan.score ?? 'n/a'}/100
          </div>
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

      {/* Summary Box */}
      <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-6">
        <h2 className="text-blue-900 font-semibold text-lg mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Quick Summary
        </h2>
        <p className="text-blue-800 leading-relaxed">
          {generateSummary(scan, evidence)}
        </p>
      </div>

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
          {/* QUICK WIN #3: Enhanced color coding with background colors and status icons */}
          <div className={`mt-2 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 ${
            dataSharingLevel === 'None' ? 'bg-green-100 text-green-800' :
            dataSharingLevel === 'Low' ? 'bg-green-50 text-green-700' :
            dataSharingLevel === 'Medium' ? 'bg-amber-100 text-amber-800' :
            'bg-red-100 text-red-800'
          }`}>
            {/* Add status icons for visual clarity and accessibility */}
            {dataSharingLevel === 'None' && <span className="text-xl" aria-hidden="true">✅</span>}
            {dataSharingLevel === 'Low' && <span className="text-xl" aria-hidden="true">✓</span>}
            {dataSharingLevel === 'Medium' && <span className="text-xl" aria-hidden="true">⚠️</span>}
            {dataSharingLevel === 'High' && <span className="text-xl" aria-hidden="true">⛔</span>}
            <span className="text-2xl font-bold">{dataSharingLevel}</span>
          </div>
          {/* Helpful description for each level */}
          <p className="text-xs text-gray-600 mt-1.5">
            {dataSharingLevel === 'None' && 'No trackers or third-party data sharing detected'}
            {dataSharingLevel === 'Low' && 'Minimal data sharing with limited third parties'}
            {dataSharingLevel === 'Medium' && 'Moderate data sharing with several third parties'}
            {dataSharingLevel === 'High' && 'Extensive data sharing with many third parties'}
          </p>
          <div className="text-xs text-slate-600 mt-1">
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

      {/* Categorized Evidence Overview - Priority 1 Task 1.2 */}
      {evidence.length > 0 && (
        <div className="space-y-6 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">📊</span>
              Evidence Categories
              <span className="text-sm font-normal text-gray-500">
                ({evidence.length} total findings)
              </span>
            </h2>
          </div>

          <div className="space-y-4">
            {Object.entries(categorizeEvidence(evidence)).map(([key, category]) => {
              if (category.items.length === 0) return null;

              const filteredCategoryItems = category.items.filter((item) => matchesFilter(item.severity));
              if (filteredCategoryItems.length === 0) return null;

              return (
                <div key={key} className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">{category.icon}</span>
                      {category.title}
                    </h2>
                    <span className="text-sm text-gray-600 bg-slate-100 px-3 py-1 rounded-full font-medium">
                      {filteredCategoryItems.length} {filteredCategoryItems.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{category.description}</p>
                  <div className="space-y-2">
                    {filteredCategoryItems.map((item) => (
                      <EvidenceItemDisplay key={`cat-${key}-${item.id}`} evidence={item} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          {' technical categories visible'}
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

      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Technical Details by Type</h2>
        <p className="text-sm text-gray-500">Expand sections below for granular technical findings</p>
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
                        <div id={sectionId(type)} className="mt-2 space-y-2">
                          {filteredItems.map((item) => (
                            <EvidenceItemDisplay key={item.id} evidence={item} />
                          ))}
                        </div>
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

      {/* Score Breakdown Section */}
      <div className="mt-8 mb-6 border-t pt-6">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-security-blue focus-visible:ring-offset-2 rounded px-1 py-1"
          aria-expanded={showBreakdown}
          aria-controls="score-breakdown-details"
        >
          <svg
            className={`w-5 h-5 transition-transform ${showBreakdown ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          How was this score calculated?
        </button>

        {showBreakdown && (
          <div
            id="score-breakdown-details"
            className="mt-4 bg-gray-50 rounded-lg p-6 animate-fade-in"
            role="region"
            aria-label="Score breakdown details"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Category</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Finding</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-700">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateBreakdown(scan, evidence).map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2 px-3">{item.category}</td>
                      <td className="py-2 px-3 text-gray-600">{item.finding}</td>
                      <td className={`py-2 px-3 text-right font-semibold ${
                        item.positive ? 'text-green-600' : item.points === 0 ? 'text-gray-600' : 'text-red-600'
                      }`}>
                        {item.points > 0 && '+'}{item.points}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-400 font-bold">
                    <td colSpan={2} className="py-3 px-3">Final Score</td>
                    <td className="py-3 px-3 text-right text-lg">{scan.score ?? 0}/100</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              <strong>Note:</strong> This is a simplified breakdown. The actual scoring algorithm considers additional factors including privacy policies, security headers, and data sharing patterns.
            </p>
          </div>
        )}
      </div>

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
    </main>
    <Footer />
    </>
  );
}
