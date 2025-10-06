/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { startUrlScan, getRecentReports } from '../lib/api';
import Card from '../components/Card';
import Footer from '../components/Footer';
import type { RecentReportsResponse } from '@privacy-advisor/shared';

const INPUT_MODES = ['url', 'app', 'address'] as const;
type InputMode = (typeof INPUT_MODES)[number];

type RecentItem = RecentReportsResponse['items'][number] & { evidenceCount: number };
type RecentQueryResult = { items: RecentItem[] };

const formatCreatedAt = (value: RecentItem['createdAt']): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

const fetchRecentReports = async (): Promise<RecentQueryResult> => {
  const response = await getRecentReports();
  return {
    items: response.items.map((item) => ({
      ...item,
      evidenceCount: item.evidenceCount ?? 0,
    })),
  };
};

export default function Home() {
  const [input, setInput] = useState('https://example.com');
  const [mode, setMode] = useState<InputMode>('url');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onScan() {
    try {
      setLoading(true);
      const { scanId, slug } = await startUrlScan(input);
      navigate(`/scan/${scanId}?slug=${encodeURIComponent(slug)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <nav className="flex items-center justify-end text-sm text-slate-600">
        <a className="underline text-security-blue" href="/docs">Docs</a>
      </nav>
      <header className="space-y-2 max-w-2xl">
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight">
          Check how safe your site, app, or wallet is
        </h1>
        <p className="text-slate-600 text-base md:text-lg">
          Instant privacy scan with clear scores and plain-language guidance.
        </p>
      </header>
      <Card>
        <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label="Input type">
          {INPUT_MODES.map((modeKey) => (
            <button
              key={modeKey}
              role="tab"
              aria-selected={mode === modeKey}
              className={`px-3 py-3 min-h-[44px] rounded-full border text-sm ${mode === modeKey ? 'bg-security-blue text-white' : 'bg-white'}`}
              onClick={() => setMode(modeKey)}
            >
              {modeKey.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="flex-1 border rounded-lg px-3 py-3 sm:py-2 text-base focus:outline-none focus:ring-2 focus:ring-security-blue"
            placeholder={mode === 'url' ? 'https://example.com' : mode === 'app' ? 'app id' : '0x... or address'}
            aria-label="Scan input"
          />
          <button
            onClick={onScan}
            disabled={loading || mode !== 'url'}
            className="px-4 py-3 sm:py-2 rounded-lg bg-pricko-green text-white disabled:opacity-50 font-medium"
          >
            {loading ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>
        {mode !== 'url' && (
          <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm" role="status">
            <span className="font-semibold">Coming Soon:</span> {mode === 'app' ? 'App' : 'Address'} privacy scanning is currently in development. Only URL scanning is available at this time.
          </div>
        )}
        <p className="text-xs text-slate-500 mt-2">Example: example.com, app id, or Solana wallet address</p>
      </Card>

      {/* Trust Indicators - Moved higher for better visibility */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-medium text-emerald-900">Open source & transparent</div>
            <p className="text-xs text-emerald-700 mt-1">All scoring logic is public and auditable</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-medium text-blue-900">No personal data collected</div>
            <p className="text-xs text-blue-700 mt-1">We don't track you while scanning others</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-medium text-amber-900">Results in seconds</div>
            <p className="text-xs text-amber-700 mt-1">Fast scanning with instant privacy scores</p>
          </div>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-semibold mb-2">Preview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border rounded-lg p-3">
                <div className="text-xs text-slate-500">Privacy Score</div>
                <div className="mt-2 inline-flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">72</div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">SAFE</span>
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-slate-500">Trackers Found</div>
                <div className="text-2xl font-bold">3</div>
                <div className="text-xs text-slate-600">Google, Facebook...</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-slate-500">SSL/HTTPS</div>
                <div className="text-2xl font-bold text-green-700">Valid</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-slate-500">Data Sharing</div>
                <div className="text-2xl font-bold text-amber-700">Medium</div>
              </div>
            </div>
          </div>
          <div className="self-center text-slate-700">
            Instant privacy scan with:
            <ul className="list-disc pl-6 mt-2 text-sm">
              <li>Trackers and third-party requests</li>
              <li>Security headers, mixed content, TLS</li>
              <li>Policy link and fingerprinting signals</li>
            </ul>
          </div>
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold mb-2">What do we check?</h2>
        <ul className="list-disc pl-6 text-slate-700 text-sm">
          <li>Trackers, third-parties, cookies</li>
          <li>Security headers, mixed content, TLS</li>
          <li>Privacy policy, basic fingerprinting signals</li>
        </ul>
      </Card>
      <Footer />
      <RecentReports />
    </div>
  );
}

function RecentReports() {
  const { data } = useQuery<RecentQueryResult>({
    queryKey: ['recent'],
    queryFn: fetchRecentReports,
    staleTime: 30_000,
  });
  const items = data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <Card>
      <h2 className="font-semibold mb-2">Recent Reports</h2>
      <ul className="divide-y">
        {items.map((report) => (
          <li key={report.slug} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{report.domain}</div>
              <div className="text-xs text-slate-500">{formatCreatedAt(report.createdAt)}</div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span
                className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${
                  report.label === 'Safe'
                    ? 'bg-green-100 text-green-700'
                    : report.label === 'High Risk'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
                title={`${report.score}%`}
              >
                {report.label}
              </span>
              <span className="text-xs text-slate-600 hidden sm:inline" title="Evidence count">
                {report.evidenceCount} items
              </span>
              <a href={`/r/${report.slug}`} className="text-security-blue underline text-sm">
                View
              </a>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
