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

type Tip = { text: string; url?: string };
const TIPS: Record<string, Tip[]> = {
  tracker: [
    { text: 'Remove or self-host analytics where possible.' },
    { text: 'Use Consent Mode or server-side analytics with IP anonymization.', url: 'https://developers.google.com/tag-platform/security/guides/consent' },
  ],
  thirdparty: [
    { text: 'Audit third-party scripts and remove unused vendors.' },
    { text: 'Use Subresource Integrity (SRI) when loading from CDNs.', url: 'https://developer.mozilla.org/docs/Web/Security/Subresource_Integrity' },
    { text: 'Enforce strict CSP for scripts and connections.', url: 'https://developer.mozilla.org/docs/Web/HTTP/CSP' },
  ],
  cookie: [
    { text: 'Set Secure and SameSite attributes for all cookies.', url: 'https://developer.mozilla.org/docs/Web/HTTP/Cookies#security' },
    { text: 'Avoid setting cookies on non-HTTPS origins.' },
  ],
  header: [
    { text: 'Add CSP, Referrer-Policy, HSTS, X-Content-Type-Options, Permissions-Policy.', url: 'https://owasp.org/www-project-secure-headers/' },
  ],
  insecure: [
    { text: 'Serve all resources over HTTPS and avoid mixed content.', url: 'https://developer.mozilla.org/docs/Web/Security/Mixed_content' },
  ],
  tls: [
    { text: 'Use modern TLS config (A grade), disable weak ciphers.', url: 'https://ssl-config.mozilla.org/' },
  ],
  policy: [
    { text: 'Add a clear Privacy Policy link on the homepage.' },
  ],
  fingerprint: [
    { text: 'Avoid fingerprinting techniques (canvas/audio/plugins access).', url: 'https://privacyguides.org/en/advanced/browser-fingerprinting/' },
  ],
};

export default function ReportPage() {
  const { slug = '' } = useParams();
  const { data, isLoading, isError } = useQuery<ReportResponse>({ queryKey: ['report', slug], queryFn: () => getReport(slug) });
  if (isLoading) return <div className="p-6">Loading…</div>;
  if (isError || !data) return (
    <div className="p-6">
      <div className="text-red-600 font-semibold">Report not found or failed to load.</div>
      <a className="text-security-blue underline" href="/">Go back</a>
    </div>
  );
  return <ReportBody slug={slug} data={data} />;
}

function ReportBody({ slug, data }: { slug: string; data: ReportResponse }) {
  const { scan, evidence, meta } = data;

  // Tunable weights/thresholds for Data Sharing
  const DS_TRACKER_WEIGHT = 2;
  const DS_THIRDPARTY_WEIGHT = 1;
  const DS_COOKIE_WEIGHT = 1;
  const DS_THRESH_LOW = 3;
  const DS_THRESH_MED = 8;

  const trackerDomains = Array.from(
    new Set(
      evidence
        .filter((ev) => ev.type === 'tracker')
        .map((ev) => String((ev.details as any)?.domain || ''))
        .filter(Boolean)
    )
  );
  const topTrackers = trackerDomains.slice(0, 2);
  const thirdpartyDomains = Array.from(
    new Set(
      evidence
        .filter((ev) => ev.type === 'thirdparty')
        .map((ev) => String((ev.details as any)?.domain || ''))
        .filter(Boolean)
    )
  );
  const cookieIssues = evidence.filter((ev) => ev.type === 'cookie').length;
  const insecureCount = evidence.filter((ev) => ev.type === 'insecure').length;
  const tls = evidence.find((ev) => ev.type === 'tls');
  const tlsGrade = ((tls?.details as any)?.grade as 'A' | 'B' | 'C' | 'D' | 'F' | undefined) || undefined;

  function sslStatus(): 'Valid' | 'Weak' | 'Invalid' {
    if (insecureCount > 0) return 'Invalid';
    if (tlsGrade && (tlsGrade === 'D' || tlsGrade === 'F')) return 'Weak';
    if (tlsGrade && tlsGrade === 'C') return 'Weak';
    return 'Valid';
  }

  function dataSharingLevel(): 'None' | 'Low' | 'Medium' | 'High' {
    if (meta?.dataSharing) return meta.dataSharing as any;
    const index = trackerDomains.length * DS_TRACKER_WEIGHT + thirdpartyDomains.length * DS_THIRDPARTY_WEIGHT + cookieIssues * DS_COOKIE_WEIGHT;
    if (index === 0) return 'None';
    if (index <= DS_THRESH_LOW) return 'Low';
    if (index <= DS_THRESH_MED) return 'Medium';
    return 'High';
  }

  type Evidence = ReportResponse['evidence'][number];
  const groups = evidence.reduce<Record<string, Evidence[]>>((acc, ev) => {
    (acc[ev.type] ||= []).push(ev as Evidence);
    return acc;
  }, {} as Record<string, Evidence[]>);

  const [open, setOpen] = React.useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    Object.keys(groups).forEach((k) => (o[k] = true));
    return o;
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSev = (searchParams.get('sev') as 'all' | 'high' | 'medium' | 'low' | null) || 'all';
  const [sevFilter, setSevFilter] = React.useState<'all' | 'high' | 'medium' | 'low'>(initialSev);
  React.useEffect(() => {
    const current = searchParams.get('sev') || 'all';
    if (current !== sevFilter) {
      const sp = new URLSearchParams(searchParams);
      if (sevFilter === 'all') sp.delete('sev');
      else sp.set('sev', sevFilter);
      setSearchParams(sp, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sevFilter]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)) return;
      if (e.key === '1') setSevFilter('all');
      else if (e.key === '2') setSevFilter('high');
      else if (e.key === '3') setSevFilter('medium');
      else if (e.key === '4') setSevFilter('low');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function matchesFilter(sev: number) {
    if (sevFilter === 'all') return true;
    if (sevFilter === 'high') return sev >= 4;
    if (sevFilter === 'medium') return sev === 3;
    return sev <= 2;
  }
  function toggle(type: string) {
    setOpen((p) => ({ ...p, [type]: !p[type] }));
  }
  function sectionId(type: string) {
    return `section-${type}`;
  }

  function exportJson() {
    const filtered = evidence.filter((ev) => matchesFilter(ev.severity));
    const payload = {
      scan: { id: scan.id, input: scan.input, score: scan.score, label: scan.label, slug },
      filter: sevFilter,
      exportedAt: new Date().toISOString(),
      evidence: filtered,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `privacy-report-${slug}-${sevFilter}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-center gap-4">
        <ScoreDial score={scan.score ?? 0} />
        <div>
          <h1 className="text-3xl font-bold">{scan.label} ({scan.score})</h1>
          <p className="text-slate-600">{scan.input}</p>
          <div className="mt-1 text-xs text-slate-600">
            Score legend: <span className="text-green-700 font-medium">Safe ≥ 70</span> · <span className="text-amber-700 font-medium">Caution 40–69</span> · <span className="text-red-700 font-medium">High Risk &lt; 40</span>
            {' '}<a href="/docs#scoring" className="underline text-security-blue">Learn more</a>
          </div>
        </div>
        <div className="ml-auto">
          <CopyButton text={typeof window !== 'undefined' ? window.location.href : ''} />
          <button onClick={exportJson} className="ml-2 px-3 py-1 rounded border text-sm">Export JSON</button>
          <a href="/docs" className="ml-2 text-sm underline text-security-blue">Docs</a>
        </div>
      </header>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <div className="text-xs text-slate-500 inline-flex items-center gap-2">
            <span>Trackers Found</span>
            <InfoPopover label="What counts as a tracker?">
              <div className="space-y-2">
                <div className="font-medium">Unique tracker domains</div>
                <p>Detected using bundled lists (e.g., EasyPrivacy, WhoTracks.me). Includes analytics, ads, and beacons.</p>
                <a href="/docs#trackers" className="text-security-blue underline">Learn more</a>
              </div>
            </InfoPopover>
          </div>
          <div className="text-2xl font-bold">{trackerDomains.length}</div>
          {trackerDomains.length > 0 && (
            <div className="text-xs text-slate-600 mt-1">{topTrackers.join(', ')}{trackerDomains.length > 2 ? '…' : ''}</div>
          )}
        </Card>
        <Card>
          <div className="text-xs text-slate-500 inline-flex items-center gap-2">
            <span>SSL/HTTPS</span>
            <InfoPopover label="How we judge SSL/HTTPS">
              <div className="space-y-2">
                <div className="font-medium">TLS and mixed content</div>
                <ul className="list-disc pl-5">
                  <li>Invalid if mixed content detected</li>
                  <li>Weak if TLS grade C/D/F</li>
                  <li>Valid otherwise</li>
                </ul>
                <a href="/docs#ssl" className="text-security-blue underline">Learn more</a>
              </div>
            </InfoPopover>
          </div>
          <div className={`text-2xl font-bold ${sslStatus() === 'Valid' ? 'text-green-600' : sslStatus() === 'Weak' ? 'text-yellow-600' : 'text-red-600'}`}>
            {sslStatus()}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">Data Sharing</div>
          <div className={`text-2xl font-bold ${dataSharingLevel() === 'High' ? 'text-red-700' : dataSharingLevel() === 'Medium' ? 'text-amber-700' : 'text-green-700'}`}>
            {dataSharingLevel()}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
            <span>Derived from trackers, third-party, and cookie flags.</span>
            <InfoPopover label="How we compute Data Sharing">
              <div className="space-y-2">
                <div className="font-medium">Data Sharing heuristic</div>
                <ul className="list-disc pl-5">
                  <li>Trackers ×2 + Third-party ×1 + Cookie issues ×1</li>
                  <li>Low ≤3, Medium ≤8, High &gt;8</li>
                </ul>
                <a href="/docs#data-sharing" className="text-security-blue underline">Learn more</a>
              </div>
            </InfoPopover>
          </div>
        </Card>
        {scan.targetType === 'address' && (
          <Card>
            <div className="text-xs text-slate-500">Wallet Risk</div>
            <div className="text-2xl font-bold text-green-700">None</div>
          </Card>
        )}
      </div>

      {/* Evidence summary row */}
      <div className="flex flex-wrap items-center gap-2" aria-label="Evidence summary">
        {(Object.entries(groups) as [string, Evidence[]][]).map(([type, list]) => {
          const high = list.filter((ev) => ev.severity >= 4).length;
          const med = list.filter((ev) => ev.severity === 3).length;
          const low = list.filter((ev) => ev.severity <= 2).length;
          return (
            <a
              key={type}
              href={`#${sectionId(type)}`}
              className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-security-blue"
              aria-label={`${type} ${list.length} items: ${high} high, ${med} medium, ${low} low`}
            >
              <span className="capitalize">{type}</span>
              <span className="ml-1 font-semibold">{list.length}</span>
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="px-1 rounded bg-red-100 text-red-700" title="High">{high}</span>
                <span className="px-1 rounded bg-yellow-100 text-yellow-700" title="Medium">{med}</span>
                <span className="px-1 rounded bg-slate-200 text-slate-700" title="Low">{low}</span>
              </span>
            </a>
          );
        })}
      </div>

      {/* Severity filter */}
      <div className="flex items-center gap-2 text-sm" role="tablist" aria-label="Severity filter (1 All, 2 High, 3 Med, 4 Low)">
        {[
          { key: 'all', label: 'All' },
          { key: 'high', label: 'High' },
          { key: 'medium', label: 'Med' },
          { key: 'low', label: 'Low' },
        ].map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={sevFilter === (t.key as any)}
            className={`px-2 py-1 rounded-full border ${sevFilter === (t.key as any) ? 'bg-security-blue text-white' : 'bg-white'}`}
            onClick={() => setSevFilter(t.key as any)}
          >
            {t.label}
          </button>
        ))}
        <span className="text-xs text-slate-500">Keys: 1=All, 2=High, 3=Med, 4=Low</span>
      </div>

      {(Object.entries(groups) as [string, Evidence[]][]).map(([type, list]) => (
        <Card key={type}>
          <button
            className="w-full flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-security-blue rounded"
            aria-expanded={open[type] ? 'true' : 'false'}
            aria-controls={sectionId(type)}
            onClick={() => toggle(type)}
          >
            <h2 className="font-semibold capitalize">{type}</h2>
            <span className="text-xs text-slate-600">{list.length} items {open[type] ? '▾' : '▸'}</span>
          </button>
          {open[type] && (
            <>
              <ul id={sectionId(type)} className="text-sm text-slate-700 space-y-1 mt-2">
                {list.filter((ev) => matchesFilter(ev.severity)).map((ev) => (
                  <li key={ev.id} className="flex items-start gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${ev.severity >= 4 ? 'bg-red-100 text-red-700' : ev.severity === 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'}`}>
                      Sev {ev.severity}
                    </span>
                    <div>
                      <span className="font-medium">{ev.title}</span>
                      {' — '}
                      <code className="text-slate-500 break-all">{JSON.stringify(ev.details)}</code>
                    </div>
                  </li>
                ))}
              </ul>
              {TIPS[type] && (
                <div className="mt-3 text-sm">
                  <div className="font-semibold">How to fix</div>
                  <ul className="list-disc pl-5 text-slate-700">
                    {TIPS[type].map((t, i) => (
                      <li key={i}>
                        {t.url ? (
                          <a className="text-security-blue underline" href={t.url} target="_blank" rel="noreferrer">
                            {t.text}
                          </a>
                        ) : (
                          t.text
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

      <footer className="text-xs text-slate-500">
        Sources: EasyPrivacy (server-side; attribution), WhoTracks.me (CC BY 4.0), Public Suffix List
        <div className="mt-1">Share: <button
          className="underline text-security-blue"
          onClick={() => {
            const url = typeof window !== 'undefined' ? window.location.href : '';
            if ((navigator as any).share) (navigator as any).share({ url }).catch(() => navigator.clipboard.writeText(url));
            else navigator.clipboard.writeText(url);
          }}
        >Copy / Share Link</button> · <button
          className="underline text-security-blue"
          onClick={() => {
            const url = typeof window !== 'undefined' ? window.location.href : '';
            navigator.clipboard.writeText(url);
          }}
        >Save Result</button> · <a className="underline text-security-blue" href={`/compare?left=${encodeURIComponent(slug)}`}>Compare</a></div>
      </footer>
      <Footer />
    </div>
  );
}
