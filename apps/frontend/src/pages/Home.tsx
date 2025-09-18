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

type RecentItem = RecentReportsResponse['items'][number];

const formatCreatedAt = (value: RecentItem['createdAt']): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

export default function Home() {
  const [input, setInput] = useState('https://example.com');
  const [mode, setMode] = useState<InputMode>('url');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onScan() {
    try {
      setLoading(true);
      const { scanId, reportSlug } = await startUrlScan(input);
      navigate(`/scan/${scanId}?slug=${encodeURIComponent(reportSlug)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <nav className="flex items-center justify-end text-sm text-slate-600">
        <a className="underline text-security-blue" href="/docs">Docs</a>
      </nav>
      <header className="space-y-2 max-w-2xl">
        <h1 className="text-5xl font-extrabold text-slate-900 leading-tight">Check how safe your site, app, or wallet is</h1>
        <p className="text-slate-600 text-lg">Instant privacy scan with clear scores and plain-language guidance.</p>
      </header>
      <Card>
        <div className="flex gap-2 mb-3" role="tablist" aria-label="Input type">
          {INPUT_MODES.map((modeKey) => (
            <button
              key={modeKey}
              role="tab"
              aria-selected={mode === modeKey}
              className={`px-3 py-1 rounded-full border ${mode === modeKey ? 'bg-security-blue text-white' : 'bg-white'}`}
              onClick={() => setMode(modeKey)}
            >
              {modeKey.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-security-blue"
            placeholder={mode === 'url' ? 'https://example.com' : mode === 'app' ? 'app id' : '0x... or address'}
            aria-label="Scan input"
          />
          <button
            onClick={onScan}
            disabled={loading || mode !== 'url'}
            className="px-4 py-2 rounded-lg bg-pricko-green text-white disabled:opacity-50"
          >
            {loading ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">Example: example.com, app id, or Solana wallet address</p>
      </Card>
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
      <div className="flex items-center gap-6 text-sm text-slate-700">
        <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-600 inline-block" /> No trackers added by us</span>
        <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Transparent scoring</span>
        <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-600 inline-block" /> Plain-language results</span>
      </div>
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
  const { data } = useQuery<RecentReportsResponse>({ queryKey: ['recent'], queryFn: getRecentReports, staleTime: 30_000 });
  const items = data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <Card>
      <h2 className="font-semibold mb-2">Recent Reports</h2>
      <ul className="divide-y">
        {items.map((report) => (
          <li key={report.slug} className="py-2 flex items-center justify-between">
            <div>
              <div className="font-medium">{report.domain}</div>
              <div className="text-xs text-slate-500">{formatCreatedAt(report.createdAt)}</div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
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
              <span className="text-xs text-slate-600" title="Evidence count">{report.evidenceCount ?? 0} items</span>
              <a href={`/r/${report.slug}`} className="text-security-blue underline">View</a>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

