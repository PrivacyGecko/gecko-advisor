/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getRecentReports } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { BRAND } from '../config/branding';
import Card from '../components/Card';
import Footer from '../components/Footer';
import Header from '../components/Header';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import RateLimitBanner, { type RateLimitInfo } from '../components/RateLimitBanner';
import EnhancedTrustIndicator from '../components/EnhancedTrustIndicator';
import type { RecentReportsResponse } from '@privacy-advisor/shared';

const INPUT_MODES = ['url', 'app', 'address'] as const;
type InputMode = (typeof INPUT_MODES)[number];

type RecentItem = RecentReportsResponse['items'][number] & { evidenceCount: number };
type RecentQueryResult = { items: RecentItem[] };

interface ScanResponse {
  scanId: string;
  slug: string;
  statusUrl: string;
  resultsUrl: string;
  rateLimit?: RateLimitInfo | null;
}

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
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const isPro = user?.subscription === 'PRO' || user?.subscription === 'TEAM';

  async function onScan() {
    try {
      setLoading(true);

      // Call the new v2 API endpoint
      const response = await fetch('/api/v2/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ url: input }),
      });

      if (!response.ok) {
        // Handle rate limit error
        if (response.status === 429) {
          const error = await response.json();
          toast.error('Daily scan limit reached. Please try again tomorrow or upgrade to Pro.');

          // Update rate limit info from error response
          if (error.rateLimit) {
            setRateLimit(error.rateLimit);
          }
          return;
        }

        // Handle other errors
        const error = await response.json();
        throw new Error(error.detail || 'Failed to start scan');
      }

      const data: ScanResponse = await response.json();

      // Update rate limit info from successful response
      if (data.rateLimit) {
        setRateLimit(data.rateLimit);
      }

      toast.success('Scan started successfully!');
      navigate(`/scan/${data.scanId}?slug=${encodeURIComponent(data.slug)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start scan';
      toast.error(message);
      console.error('[Home] Scan failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header
        onShowLogin={() => setShowLoginModal(true)}
        onShowSignup={() => setShowSignupModal(true)}
      />
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
      {/* Hero Section - PrivacyGecko Branding */}
      <header className="text-center space-y-4 py-8 md:py-12">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6 animate-fade-in">
          <img
            src={BRAND.logo.src}
            alt={BRAND.logo.alt}
            className="h-24 md:h-32 w-auto object-contain"
          />
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <p className="text-2xl md:text-3xl text-gecko-600 font-bold">
            {BRAND.tagline}
          </p>
        </div>

        {/* Value Proposition */}
        <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed mt-6">
          Scan and monitor privacy policies instantly. Get actionable privacy scores,
          track changes over time, and protect your data with our AI-powered scanner.
        </p>

        {/* Trust Badge */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gecko-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span className="font-medium">10,000+ Scans Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gecko-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-medium">Results in Seconds</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gecko-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="font-medium">Privacy First</span>
          </div>
        </div>
      </header>

      {/* Rate limit banner */}
      {(rateLimit || isPro) && (
        <RateLimitBanner rateLimit={rateLimit} isPro={isPro} />
      )}

      <Card>
        <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label="Input type">
          {INPUT_MODES.map((modeKey) => (
            <button
              key={modeKey}
              role="tab"
              aria-selected={mode === modeKey}
              className={`px-3 py-3 min-h-[44px] rounded-full border text-sm ${mode === modeKey ? 'bg-gecko-600 text-white' : 'bg-white'}`}
              onClick={() => setMode(modeKey)}
            >
              {modeKey.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="scan-input" className="sr-only">
            Enter website URL to scan for privacy analysis
          </label>
          <input
            id="scan-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="flex-1 border rounded-lg px-3 py-3 sm:py-2 text-base focus:outline-none focus:ring-2 focus:ring-gecko-600"
            placeholder={mode === 'url' ? 'https://example.com' : mode === 'app' ? 'app id' : '0x... or address'}
            aria-label="Website URL to scan for privacy analysis"
            aria-describedby="scan-help-text"
          />
          <span id="scan-help-text" className="sr-only">
            Enter a valid website URL starting with https://
          </span>
          <button
            onClick={onScan}
            disabled={loading || mode !== 'url' || (rateLimit?.scansRemaining === 0 && !isPro)}
            className="px-6 py-3 min-h-[48px] rounded-lg bg-gecko-600 hover:bg-gecko-700 active:bg-gecko-800 text-white disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            aria-label="Start privacy scan"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Scanning...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Scan Now
                </>
              )}
            </span>
          </button>
        </div>
        {mode !== 'url' && (
          <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm" role="status">
            <span className="font-semibold">Coming Soon:</span> {mode === 'app' ? 'App' : 'Address'} privacy scanning is currently in development. Only URL scanning is available at this time.
          </div>
        )}
        <p className="text-xs text-slate-500 mt-2">Example: example.com, app id, or Solana wallet address</p>
      </Card>

      {/* Trust Indicators - Premium enhanced version */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <EnhancedTrustIndicator
          variant="gecko"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="Open source & transparent"
          description="All scoring logic is public and auditable"
        />

        <EnhancedTrustIndicator
          variant="blue"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
          title="No personal data collected"
          description="We don't track you while scanning others"
        />

        <EnhancedTrustIndicator
          variant="amber"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          title="Results in seconds"
          description="Fast scanning with instant privacy scores"
        />
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

    {/* Auth modals */}
    <LoginModal
      isOpen={showLoginModal}
      onClose={() => setShowLoginModal(false)}
      onSwitchToSignup={() => {
        setShowLoginModal(false);
        setShowSignupModal(true);
      }}
    />
    <SignupModal
      isOpen={showSignupModal}
      onClose={() => setShowSignupModal(false)}
      onSwitchToLogin={() => {
        setShowSignupModal(false);
        setShowLoginModal(true);
      }}
    />
    </>
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
              <a href={`/r/${report.slug}`} className="text-gecko-600 underline text-sm">
                View
              </a>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
