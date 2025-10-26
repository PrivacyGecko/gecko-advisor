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
import ProfessionalBadge from '../components/ProfessionalBadge';
import EnhancedTrustIndicator from '../components/EnhancedTrustIndicator';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
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
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const navigate = useNavigate();
  const { token } = useAuth();

  async function onScan() {
    try {
      setLoading(true);

      // Call the v2 API endpoint
      const response = await fetch('/api/v2/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ url: input }),
      });

      if (!response.ok) {
        // Handle errors
        const error = await response.json();
        throw new Error(error.detail || 'Failed to start scan');
      }

      const data: ScanResponse = await response.json();

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
      {/* Hero Section - Professional Privacy Analysis */}
      <header className="text-center space-y-6 py-8 md:py-16">
        {/* Logo */}
        <div className="flex items-center justify-center mb-4 animate-fade-in">
          <img
            src={BRAND.logo.src}
            alt={BRAND.logo.alt}
            className="h-20 md:h-28 w-auto object-contain"
          />
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight max-w-4xl mx-auto px-4">
          Professional Website Privacy Analysis
        </h1>

        {/* Professional Capability Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mt-6">
          <ProfessionalBadge variant="open-source" size="md" />
          <ProfessionalBadge variant="transparent" size="md" />
          <ProfessionalBadge variant="evidence-based" size="md" />
        </div>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed px-4">
          Trusted by privacy researchers, journalists, and compliance teams to analyze website tracking, cookies, and data collection practices.
        </p>
      </header>

      {/* Elevated Scan Input Box */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 md:p-8">
        {/* Input Mode Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          <button
            onClick={() => setMode('url')}
            className={`px-4 py-2 font-medium transition-colors ${
              mode === 'url'
                ? 'text-advisor-600 border-b-2 border-advisor-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-label="Scan website URL"
          >
            URL
          </button>
          <button
            onClick={() => setMode('app')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              mode === 'app'
                ? 'text-advisor-600 border-b-2 border-advisor-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-label="Scan mobile app (coming soon)"
          >
            APP
            <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
          </button>
          <button
            onClick={() => setMode('address')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              mode === 'address'
                ? 'text-advisor-600 border-b-2 border-advisor-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-label="Scan wallet address (coming soon)"
          >
            ADDRESS
            <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
          </button>
        </div>

        {/* Input field with dynamic placeholder */}
        <div className="flex flex-col sm:flex-row gap-3">
          <label htmlFor="scan-input" className="sr-only">
            {mode === 'url'
              ? 'Enter website URL to scan for privacy analysis'
              : mode === 'app'
                ? 'Enter app package name (coming soon)'
                : 'Enter wallet address (coming soon)'}
          </label>
          <input
            id="scan-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-advisor-500 focus:border-advisor-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
            placeholder={
              mode === 'url'
                ? 'Enter website URL (e.g., example.com)'
                : mode === 'app'
                  ? 'Enter app package name (e.g., com.example.app)'
                  : 'Enter wallet address (e.g., 0x...)'
            }
            disabled={mode !== 'url'}
            aria-label={
              mode === 'url'
                ? 'Website URL to scan for privacy analysis'
                : mode === 'app'
                  ? 'App package name (coming soon)'
                  : 'Wallet address (coming soon)'
            }
            aria-describedby="scan-help-text"
          />
          <span id="scan-help-text" className="sr-only">
            {mode === 'url'
              ? 'Enter a valid website URL starting with https://'
              : 'This feature is coming soon'}
          </span>
          <button
            onClick={onScan}
            disabled={loading || mode !== 'url'}
            className="w-full sm:w-auto px-8 py-4 min-h-[56px] rounded-lg bg-advisor-600 hover:bg-advisor-700 active:bg-advisor-800 text-white disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-200"
            aria-label="Start privacy scan"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Scanning...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Scan Now
                </>
              )}
            </span>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          {mode === 'url'
            ? 'Instant analysis • Evidence-based results • Open-source methodology'
            : 'This feature is coming soon. Stay tuned!'}
        </p>
      </div>

      {/* Trust Indicators - Premium enhanced version */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <EnhancedTrustIndicator
          variant="gecko"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="Open Source & Auditable"
          description="All scanning methodology is public on GitHub. Verify our approach and contribute improvements."
        />

        <EnhancedTrustIndicator
          variant="blue"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
          title="Privacy-First Analysis"
          description="We analyze privacy practices without tracking users. No cookies, no analytics, no data collection."
        />

        <EnhancedTrustIndicator
          variant="amber"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          title="Evidence-Based Results"
          description="Every finding is backed by evidence from recognized privacy databases and scanning results."
        />
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

    {/* Auth modals */}
    <LoginModal
      isOpen={showLoginModal}
      onClose={() => setShowLoginModal(false)}
      onSwitchToSignup={() => {
        setShowLoginModal(false);
        setShowSignupModal(true);
      }}
      onForgotPassword={(emailValue) => {
        setForgotPasswordEmail(emailValue ?? '');
        setShowLoginModal(false);
        setShowForgotPasswordModal(true);
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
    <ForgotPasswordModal
      isOpen={showForgotPasswordModal}
      onClose={() => setShowForgotPasswordModal(false)}
      onBackToLogin={() => setShowLoginModal(true)}
      defaultEmail={forgotPasswordEmail}
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
              <a href={`/r/${report.slug}`} className="text-trust-600 hover:text-trust-700 underline text-sm">
                View
              </a>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
