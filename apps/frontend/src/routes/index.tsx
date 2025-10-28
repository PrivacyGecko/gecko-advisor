/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import Card from '../components/Card';
import Footer from '../components/Footer';
import { getRecentReports, startUrlScan } from '../lib/api';
import { readHistory, type ScanHistoryEntry } from '../lib/history';
import { RecentScans } from '../components/RecentScans';

const INPUT_MODES = ['url', 'app', 'address'] as const;
type InputMode = (typeof INPUT_MODES)[number];

export default function HomeRoute() {
  const DEFAULT_URL = 'https://example.com';
  const [input, setInput] = useState(DEFAULT_URL);
  const [mode, setMode] = useState<InputMode>('url');
  const [history, setHistory] = useState<ScanHistoryEntry[]>(() => readHistory());
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode !== 'url') throw new Error('Only URL scans are available right now.');
      const response = await startUrlScan(input.trim());
      return response;
    },
    onSuccess: (payload) => {
      setError(null);
      navigate(`/scan/${payload.scanId}?slug=${encodeURIComponent(payload.slug)}`);
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        setError(err.message);
        return;
      }
      setError('Failed to start scan. Please try again.');
    },
  });

  const { data: recent } = useQuery({
    queryKey: ['recent-reports'],
    queryFn: getRecentReports,
    staleTime: 60_000,
  });

  useEffect(() => {
    const handleHistoryUpdate = () => setHistory(readHistory());
    window.addEventListener('privacy-history-updated', handleHistoryUpdate);
    window.addEventListener('storage', handleHistoryUpdate);
    return () => {
      window.removeEventListener('privacy-history-updated', handleHistoryUpdate);
      window.removeEventListener('storage', handleHistoryUpdate);
    };
  }, []);

  const recentReports = useMemo(() => recent?.items ?? [], [recent]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending) return;
    mutation.mutate();
  };

  const isUrlMode = mode === 'url';

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">Privacy insights in seconds</h1>
          <p className="mt-2 max-w-xl text-base text-slate-600 sm:text-lg">Scan a site, get a transparent score, and focus on the top fixes that move your privacy posture forward.</p>
        </div>
        <a className="text-sm font-medium text-security-blue underline focus:outline-none focus-visible:ring-2 focus-visible:ring-security-blue focus-visible:ring-offset-2" href="/docs">
          Docs
        </a>
      </header>

      <Card>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Scan type">
            {INPUT_MODES.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                onClick={() => setMode(key)}
                className={`rounded-full px-3 py-1 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-security-blue ${mode === key ? 'bg-security-blue text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onFocus={() => {
                if (input === DEFAULT_URL) {
                  // Select the helper text so users can immediately type over it
                  requestAnimationFrame(() => {
                    inputRef.current?.select();
                  });
                }
              }}
              className="w-full flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-security-blue"
              placeholder={mode === 'url' ? 'https://example.com' : mode === 'app' ? 'App ID (coming soon)' : 'Wallet address (coming soon)'}
              aria-label="Scan input"
              disabled={!isUrlMode}
              required
            />
            <button
              type="submit"
              disabled={!isUrlMode || mutation.isPending}
              className="inline-flex min-h-[48px] w-full justify-center rounded-xl bg-security-blue px-5 text-base font-semibold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-security-blue disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {mutation.isPending ? 'Scanningâ€¦' : 'Start Scan'}
            </button>
          </div>
          <p className="text-xs text-slate-500">URL scanning is live. App and wallet checks are coming soon.</p>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </form>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-slate-800">What youâ€™ll see</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Privacy Score</div>
              <div className="mt-2 inline-flex items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gecko-100 text-xl font-bold text-gecko-700">84</span>
                <span className="rounded-full bg-gecko-100 px-2 py-0.5 text-xs font-semibold text-gecko-700">SAFE</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Top fix</div>
              <p className="mt-2 text-sm text-slate-700">Remove tracking pixels without consent</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Data sharing</div>
              <p className="mt-2 text-sm font-semibold text-amber-700">Medium</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">TLS / HTTPS</div>
              <p className="mt-2 text-sm font-semibold text-gecko-700">Valid</p>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-slate-800">What we scan</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Trackers, third-party requests, and fingerprinting</li>
            <li>Cookies and security headers</li>
            <li>Mixed content, TLS grade, and policy links</li>
          </ul>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Recent community reports</h2>
            <span className="text-xs uppercase tracking-wide text-slate-400">Public data</span>
          </div>
          <RecentReportsList items={recentReports} />
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-slate-800">Your recent scans</h2>
          <RecentScans entries={history} />
        </Card>
      </section>

      <Footer />
    </div>
  );
}

function RecentReportsList({ items }: { items: Awaited<ReturnType<typeof getRecentReports>>['items'] }) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">Run your first scans to populate this list.</p>;
  }
  return (
    <ul className="mt-3 divide-y divide-slate-200 text-sm">
      {items.map((item) => (
        <li key={item.slug} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-800">{item.domain}</p>
            <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={badgeClass(item.label)} title={`${item.score}%`}>
              {item.label}
            </span>
            <a
              href={`/r/${encodeURIComponent(item.slug)}`}
              className="inline-flex min-h-[40px] items-center rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-security-blue"
            >
              View report
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function badgeClass(label: string | undefined): string {
  if (label === 'Safe') return 'rounded-full bg-gecko-100 px-2 py-1 text-xs font-semibold text-gecko-700';
  if (label === 'High Risk') return 'rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700';
  return 'rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700';
}

