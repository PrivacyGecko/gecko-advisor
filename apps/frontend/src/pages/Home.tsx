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
import EnhancedTrustIndicator from '../components/EnhancedTrustIndicator';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import GradeBadge from '../components/GradeBadge';
import type { RecentReportsResponse } from '@privacy-advisor/shared';

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
      {/* Hero Section - Privacy Scanner */}
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
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight max-w-4xl mx-auto px-4">
          See What's Tracking You Online
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed px-4">
          Scan any website to uncover trackers, cookies, and hidden data collection. Open-source and free for everyone.
        </p>
      </header>

      {/* Elevated Scan Input Box */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 md:p-8">
        {/* Simplified header - removed tabs for focused UX (Quick Win #2) */}
        <div className="mb-4">
          <label htmlFor="scan-input" className="block text-sm font-medium text-gray-700 mb-2">
            Website URL
          </label>
        </div>

        {/* Input field for website scanning */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="scan-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-advisor-500 focus:border-advisor-500 transition-colors"
            placeholder="Enter website URL (e.g., example.com)"
            aria-label="Website URL to scan for privacy analysis"
            aria-describedby="scan-help-text"
          />
          <button
            onClick={onScan}
            disabled={loading}
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
        <p className="text-xs text-gray-500 mt-3 flex items-center justify-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span id="scan-help-text">Scan completes in 5-10 seconds • 100% free and transparent</span>
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

      <RecentReports />

      <Card>
        <h2 className="font-semibold mb-2">What do we check?</h2>
        <ul className="list-disc pl-6 text-slate-700 text-sm">
          <li>Trackers, third-parties, cookies</li>
          <li>Security headers, mixed content, TLS</li>
          <li>Privacy policy, basic fingerprinting signals</li>
        </ul>
      </Card>
      <Footer />
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
          <li key={report.slug} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 hover:bg-gray-50/50 transition-colors rounded px-2 -mx-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate text-gray-900">{report.domain}</div>
              <div className="text-xs text-gray-500">
                {formatCreatedAt(report.createdAt)}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Letter Grade Badge - Primary indicator */}
              <GradeBadge score={report.score} size="md" showLabel={false} />

              {/* Keep existing label as secondary info (optional) */}
              <span className="text-xs text-gray-600 hidden md:inline">
                {report.label}
              </span>

              <span className="text-xs text-gray-600 hidden lg:inline min-w-[60px] text-right">
                {report.evidenceCount} items
              </span>
              <a
                href={`/r/${report.slug}`}
                className="text-advisor-600 hover:text-advisor-700 hover:underline text-sm font-medium transition-colors"
              >
                View →
              </a>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
