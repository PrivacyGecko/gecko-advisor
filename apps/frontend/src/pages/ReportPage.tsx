/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getReport } from '../lib/api';
import ScoreDial from '../components/ScoreDial';
import Card from '../components/Card';
import CopyButton from '../components/CopyButton';
import InfoPopover from '../components/InfoPopover';
import Footer from '../components/Footer';
import type { ReportResponse } from '@privacy-advisor/shared';
import { computeDataSharingLevel, type DataSharingLevel } from '../lib/dataSharing';

type EvidenceItem = ReportResponse['evidence'][number];
type EvidenceType = EvidenceItem['type'];
type SeverityFilter = 'all' | 'high' | 'medium' | 'low';

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

const shareCurrentUrl = async () => {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  if (!url) return;
  if (navigator.share) {
    try {
      await navigator.share({ url });
      return;
    } catch {
      /* ignore to fall back */
    }
  }
  await navigator.clipboard?.writeText(url);
};

const copyCurrentUrl = async () => {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  if (!url) return;
  await navigator.clipboard?.writeText(url);
};

export default function ReportPage() {
  const { slug = '' } = useParams();
  const { data, isLoading, isError } = useQuery<ReportResponse>({ queryKey: ['report', slug], queryFn: () => getReport(slug) });
  if (isLoading) return <div className="p-6">Loading...</div>;
  if (isError || !data) {
    return (
      <div className="p-6">
        <div className="text-red-600 font-semibold">Report not found or failed to load.</div>
        <a className="text-security-blue underline" href="/">Go back</a>
      </div>
    );
  }
  return <ReportBody slug={slug} data={data} />;
}

function ReportBody({ slug, data }: { slug: string; data: ReportResponse }) {
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
      groupEntries.forEach(([type]) => {
        if (next[type] === undefined) next[type] = true;
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
    const payload = {
      scan: { id: scan.id, input: scan.input, score: scan.score, label: scan.label, slug },
      filter: sevFilter,
      exportedAt: new Date().toISOString(),
      evidence: filtered,
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-center gap-4">
        <ScoreDial score={scan.score ?? 0} />
        <div>
          <h1 className="text-3xl font-bold">{scan.label} ({scan.score ?? 'n/a'})</h1>
          <p className="text-slate-600">{scan.input}</p>
          <div className="mt-1 text-xs text-slate-600">
            Score legend: <span className="text-green-700 font-medium">Safe &gt;= 70</span> ? <span className="text-amber-700 font-medium">Caution 40-69</span> ? <span className="text-red-700 font-medium">High Risk &lt; 40</span>{' '}
            <a href="/docs#scoring" className="underline text-security-blue">Learn more</a>
          </div>
        </div>
        <div className="ml-auto">
          <CopyButton text={typeof window !== 'undefined' ? window.location.href : ''} />
          <button onClick={exportJson} className="ml-2 px-3 py-1 rounded border text-sm">Export JSON</button>
          <a href="/docs" className="ml-2 text-sm underline text-security-blue">Docs</a>
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
          <div className="text-xs text-slate-500">Data sharing level</div>
          <div className="mt-2 text-2xl font-semibold">{dataSharingLevel}</div>
          <div className="text-xs text-slate-600">
            Trackers {trackerDomains.length} ? Third-party {thirdpartyDomains.length} ? Cookies {cookieIssues}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">TLS/HTTPS</div>
          <div className="mt-2 text-2xl font-semibold">{sslStatus}</div>
          <div className="text-xs text-slate-600">TLS grade {tlsGrade ?? 'unknown'}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">Top trackers</div>
          <div className="mt-2 text-sm text-slate-700">
            {topTrackers.length > 0 ? topTrackers.join(', ') : 'None detected'}
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-sm" role="tablist" aria-label="Severity filter (1 All, 2 High, 3 Med, 4 Low)">
        {severityOptions.map((option) => (
          <button
            key={option.key}
            role="tab"
            aria-selected={sevFilter === option.key}
            className={`px-2 py-1 rounded-full border ${sevFilter === option.key ? 'bg-security-blue text-white' : 'bg-white'}`}
            onClick={() => setSevFilter(option.key)}
          >
            {option.label}
          </button>
        ))}
        <span className="text-xs text-slate-500">Keys: 1=All, 2=High, 3=Med, 4=Low</span>
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
              aria-label={`${type} ${list.length} items: ${high} high, ${medium} medium, ${low} low`}
            >
              <span className="capitalize">{type}</span>
              <span className="ml-1 font-semibold">{list.length}</span>
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="px-1 rounded bg-red-100 text-red-700" title="High">{high}</span>
                <span className="px-1 rounded bg-yellow-100 text-yellow-700" title="Medium">{medium}</span>
                <span className="px-1 rounded bg-slate-200 text-slate-700" title="Low">{low}</span>
              </span>
            </a>
          );
        })}
      </div>

      {groupEntries.map(([type, list]) => (
        <Card key={type}>
          <button
            className="w-full flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-security-blue rounded"
            aria-expanded={open[type] ? 'true' : 'false'}
            aria-controls={sectionId(type)}
            onClick={() => toggle(type)}
          >
            <h2 className="font-semibold capitalize">{type}</h2>
            <span className="text-xs text-slate-600">{list.length} items {open[type] ? '-' : '+'}</span>
          </button>
          {open[type] && (
            <>
              <ul id={sectionId(type)} className="text-sm text-slate-700 space-y-1 mt-2">
                {list.filter((item) => matchesFilter(item.severity)).map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${item.severity >= 4 ? 'bg-red-100 text-red-700' : item.severity === 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'}`}>
                      Sev {item.severity}
                    </span>
                    <div>
                      <span className="font-medium">{item.title}</span>
                      {' - '}
                      <code className="text-slate-500 break-all">{safeStringify(item.details)}</code>
                    </div>
                  </li>
                ))}
              </ul>
              {TIPS[type] && (
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
      ))}

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
  );
}


