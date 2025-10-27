import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Card from '../../components/Card';
import Footer from '../../components/Footer';
import { ScoreBadge } from '../../components/ScoreBadge';
import { FixCard } from '../../components/FixCard';
import { ShareBar } from '../../components/ShareBar';
import { ApiError, getReport } from '../../lib/api';
import { toReportView, type ReportViewModel } from '../../lib/adapters/scan';
import { applyShareMeta } from '../../lib/meta';
import { useSentryRouteTags } from '../../sentry';

const appOrigin = (import.meta.env.VITE_STAGE_ORIGIN ?? '').replace(/\/$/, '');
const ogImage = `${appOrigin || ''}/og-card.png`;

export default function ShareRoute() {
  const { slug = '' } = useParams();
  useSentryRouteTags({ slug });

  const { data, error, isLoading } = useQuery({
    queryKey: ['share-report', slug],
    queryFn: () => getReport(slug),
    enabled: Boolean(slug),
    retry: 1,
  });

  const reportView = useMemo<ReportViewModel | null>(() => {
    if (!data) return null;
    return toReportView(data);
  }, [data]);

  useEffect(() => {
    if (!reportView) return;
    const titleScore = typeof reportView.score === 'number' ? `${reportView.score}` : 'pending';
    const description = reportView.topFixes[0]
      ? `Top fix: ${reportView.topFixes[0].title}`
      : `Data sharing level: ${reportView.dataSharing}`;
    const shareUrl = reportView.shareUrl.startsWith('http')
      ? reportView.shareUrl
      : `${appOrigin}${reportView.shareUrl}`;
    const cleanup = applyShareMeta({
      title: `Privacy report – ${reportView.domain} (${titleScore})`,
      description,
      url: shareUrl,
      image: ogImage,
    });
    return cleanup;
  }, [reportView]);

  if (isLoading) {
    return <LoadingState message="Loading privacy report…" />;
  }

  if (error instanceof ApiError) {
    return <ErrorState message={error.message} />;
  }

  if (error instanceof Error) {
    return <ErrorState message={error.message} />;
  }

  if (!reportView) {
    return <ErrorState message="Report not found." />;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Privacy report</h1>
          <p className="text-sm text-slate-500">Scanned target: <span className="break-all font-medium text-slate-800">{reportView.domain}</span></p>
        </div>
        <Link
          to="/"
          className="inline-flex min-h-[40px] items-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-security-blue"
        >
          Run your own scan
        </Link>
      </header>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[200px,1fr]">
        <ScoreBadge score={reportView.score} band={reportView.scoreBand} label={reportView.scoreLabel} size="lg" />
        <div className="space-y-3 text-sm text-slate-700">
          <p>Data sharing level: <span className="font-semibold text-slate-900">{reportView.dataSharing}</span></p>
          <p>TLS grade: <span className="font-semibold text-slate-900">{reportView.stats.tlsGrade ?? '—'}</span></p>
          <p>Trackers detected: <span className="font-semibold text-slate-900">{reportView.stats.trackerCount}</span></p>
          <p>Third-party requests: <span className="font-semibold text-slate-900">{reportView.stats.thirdPartyCount}</span></p>
        </div>
      </section>

      <ShareBar url={reportView.shareUrl} message={reportView.shareMessage} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Top fixes</h2>
        {reportView.topFixes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">No critical issues detected.</p>
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
          <h3 className="text-base font-semibold text-slate-900">Data sharing signals</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            <li>Trackers: {reportView.stats.trackerCount}</li>
            <li>Third parties: {reportView.stats.thirdPartyCount}</li>
            <li>Cookies flagged: {reportView.stats.cookieCount}</li>
          </ul>
        </Card>
        <Card>
          <h3 className="text-base font-semibold text-slate-900">Evidence snapshot</h3>
          <p className="mt-2 text-sm text-slate-600">Full evidence is available on interactive reports. Start a scan to explore every finding.</p>
        </Card>
      </section>

      <Footer />
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center gap-3 p-6 text-center text-slate-600">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-security-blue" aria-hidden="true" />
      <div className="text-base font-semibold">{message}</div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-2xl font-semibold text-red-700">Could not load report</div>
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
