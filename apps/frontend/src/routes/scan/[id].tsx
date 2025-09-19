import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Card from '../../components/Card';
import Footer from '../../components/Footer';
import ProgressDial from '../../components/ProgressDial';
import { EvidenceList } from '../../components/EvidenceList';
import { FixCard } from '../../components/FixCard';
import { ScoreBadge } from '../../components/ScoreBadge';
import { ShareBar } from '../../components/ShareBar';
import { ApiError, getReport, getScanStatus } from '../../lib/api';
import { toReportView, type ReportViewModel } from '../../lib/adapters/scan';
import { addHistory } from '../../lib/history';
import { useSentryRouteTags } from '../../sentry';

const DEFAULT_PROGRESS = 35;

type SeverityFilter = 'all' | 'high' | 'medium' | 'low';

const parseFilter = (value: string | null): SeverityFilter => {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'all';
};

export default function ScanRoute() {
  const { id = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const severityParam = searchParams.get('sev');
  const [filter, setFilter] = useState<SeverityFilter>(() => parseFilter(severityParam));
  const [error, setError] = useState<string | null>(null);
  const addedSlugRef = useRef<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ['scan-status', id],
    queryFn: () => getScanStatus(id),
    refetchInterval: (query) => {
      const state = query.state.data?.status;
      return state === 'done' || state === 'error' ? false : 2000;
    },
    enabled: Boolean(id),
    retry: false,
  });

  const status = statusQuery.data;
  const slugFromQuery = searchParams.get('slug') ?? undefined;
  const resolvedSlug = status?.slug ?? slugFromQuery;

  useSentryRouteTags({ scanId: id, slug: resolvedSlug });

  const reportQuery = useQuery({
    queryKey: ['report', resolvedSlug],
    queryFn: () => getReport(resolvedSlug ?? ''),
    enabled: Boolean(resolvedSlug && status?.status === 'done'),
    staleTime: 0,
    retry: 2,
  });

  const reportView = useMemo<ReportViewModel | null>(() => {
    if (!reportQuery.data) return null;
    return toReportView(reportQuery.data);
  }, [reportQuery.data]);

  useEffect(() => {
    const latestError = statusQuery.error ?? reportQuery.error;
    if (!latestError) return;
    if (latestError instanceof ApiError) setError(latestError.message);
    else if (latestError instanceof Error) setError(latestError.message);
    else setError('An unexpected error occurred.');
  }, [statusQuery.error, reportQuery.error]);

  useEffect(() => {
    if (!reportView) return;
    if (addedSlugRef.current === reportView.slug) return;
    addedSlugRef.current = reportView.slug;
    addHistory({
      slug: reportView.slug,
      domain: reportView.domain,
      score: reportView.score,
      label: reportView.label,
    });
  }, [reportView]);

  useEffect(() => {
    const next = parseFilter(severityParam);
    setFilter(next);
  }, [severityParam]);

  const updateFilter = (next: SeverityFilter) => {
    setFilter(next);
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'all') nextParams.delete('sev');
    else nextParams.set('sev', next);
    setSearchParams(nextParams, { replace: true });
  };

  if (!id) {
    return <ErrorState message="Scan ID missing. Please start a new scan." />;
  }

  if (statusQuery.isPending) {
    return <ScanningState status="queued" progress={DEFAULT_PROGRESS} />;
  }

  if (statusQuery.isError) {
    return <ErrorState message={error ?? 'Unable to retrieve scan status.'} />;
  }

  if (status?.status === 'error') {
    return <ErrorState message={error ?? 'Scan failed. Please try again.'} />;
  }

  if (status?.status !== 'done') {
    const progress = status?.progress ?? DEFAULT_PROGRESS;
    return <ScanningState status={status?.status ?? 'queued'} progress={progress} slug={resolvedSlug} />;
  }

  if (reportQuery.isPending || !reportView) {
    return <LoadingReport />;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-slate-300 px-3 text-sm font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-security-blue"
        >
          <span aria-hidden="true">&larr;</span> Home
        </Link>
        <a className="text-sm font-medium text-security-blue underline focus:outline-none focus-visible:ring-2 focus-visible:ring-security-blue focus-visible:ring-offset-2" href="/docs">
          Docs
        </a>
      </header>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[220px,1fr]">
        <ScoreBadge score={reportView.score} band={reportView.scoreBand} label={reportView.scoreLabel} size="lg" />
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">Scan target</div>
          <div className="break-all text-lg font-semibold text-slate-900">{reportView.domain}</div>
          <div className="text-sm text-slate-600">{reportView.summary ?? 'Top risk and remediation guidance ready.'}</div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-700 sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Data sharing</dt>
              <dd className="font-semibold text-slate-800">{reportView.dataSharing}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">TLS grade</dt>
              <dd className="font-semibold text-slate-800">{reportView.stats.tlsGrade ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Trackers</dt>
              <dd className="font-semibold text-slate-800">{reportView.stats.trackerCount}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Third-parties</dt>
              <dd className="font-semibold text-slate-800">{reportView.stats.thirdPartyCount}</dd>
            </div>
          </dl>
        </div>
      </section>

      <ShareBar url={reportView.shareUrl} message={reportView.shareMessage} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Top fixes</h2>
          <span className="text-xs uppercase tracking-wide text-slate-400">Most impactful first</span>
        </div>
        {reportView.topFixes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">No high-severity findings. Keep monitoring for changes.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {reportView.topFixes.map((fix) => (
              <FixCard key={fix.id} fix={fix} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold text-slate-900">Data sharing breakdown</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            <li>Trackers detected: {reportView.stats.trackerCount}</li>
            <li>Third-party requests: {reportView.stats.thirdPartyCount}</li>
            <li>Cookies flagged: {reportView.stats.cookieCount}</li>
          </ul>
        </Card>
        {reportView.walletRisk && (
          <Card>
            <h3 className="text-base font-semibold text-slate-900">Wallet risk</h3>
            <p className="mt-2 text-sm text-slate-600">{reportView.walletRisk}</p>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Evidence</h2>
        <EvidenceList items={reportView.evidence} filter={filter} onFilterChange={updateFilter} />
      </section>

      <Footer />
    </div>
  );
}

function ScanningState({ status, progress, slug }: { status: string; progress: number; slug?: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-6 p-6 text-center">
      <ProgressDial percent={Math.min(100, Math.max(5, progress))} />
      <div className="text-2xl font-semibold text-slate-900">{status === 'running' ? 'Scanning in progress…' : 'Queued…'}</div>
      <p className="max-w-md text-sm text-slate-600">We’re collecting evidence, checking trackers, and grading TLS. This usually takes under 10 seconds.</p>
      {slug && (
        <p className="text-xs text-slate-400">Shareable link will be available soon at <span className="break-all">/r/{slug}</span></p>
      )}
      <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Secure connection</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-sky-500" /> Transparent scan</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" /> No data stored</span>
      </div>
    </div>
  );
}

function LoadingReport() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-3 p-6 text-center text-slate-600">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-security-blue" aria-hidden="true" />
      <div className="text-lg font-semibold">Preparing report…</div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-2xl font-semibold text-red-700">Something went wrong</div>
      <p className="text-sm text-slate-600">{message}</p>
      <Link
        to="/"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-security-blue"
      >
        Start a new scan
      </Link>
    </div>
  );
}