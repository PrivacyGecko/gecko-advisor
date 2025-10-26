/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getRecentReports } from '../lib/api';
import type { RecentReportsResponse } from '@privacy-advisor/shared';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Card from '../components/Card';
import GradeBadge from '../components/GradeBadge';

type RecentItem = RecentReportsResponse['items'][number] & { evidenceCount: number };
type RecentQueryResult = { items: RecentItem[] };

/**
 * Helper function for converting dates to relative time strings
 * @param value - Date object or ISO string
 * @returns Human-readable relative time string
 */
const getRelativeTime = (value: RecentItem['createdAt']): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Fetch recent reports from the API
 * Ensures evidenceCount is always a number (defaults to 0)
 */
const fetchRecentReports = async (): Promise<RecentQueryResult> => {
  const response = await getRecentReports();
  return {
    items: response.items.map((item) => ({
      ...item,
      evidenceCount: item.evidenceCount ?? 0,
    })),
  };
};

/**
 * ReportsPage Component - Recent Privacy Scans Listing
 *
 * A comprehensive page that displays all publicly available privacy scans
 * from the community. Features include:
 *
 * - Grid layout with responsive design (1/2/3 columns)
 * - Each report card shows domain, favicon, grade, and metadata
 * - Hover effects and smooth transitions
 * - Loading state with spinner
 * - Empty state with call-to-action
 * - Error handling
 * - Accessibility compliant (ARIA labels, semantic HTML)
 *
 * @example
 * ```tsx
 * <ReportsPage />
 * ```
 */
export default function ReportsPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery<RecentQueryResult>({
    queryKey: ['recent-reports'],
    queryFn: fetchRecentReports,
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes
  });

  const items = data?.items ?? [];

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-advisor-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading recent scans...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Failed to Load Scans</h3>
            <p className="mt-2 text-sm text-gray-500">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-advisor-600 hover:bg-advisor-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Empty State
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Recent Privacy Scans
              </h1>
              <p className="mt-2 text-gray-600">
                Browse all publicly available privacy scans from our community
              </p>
            </div>

            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No scans yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Get started by scanning your first website.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-advisor-600 hover:bg-advisor-700 transition-colors"
                >
                  Start a Scan
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Success State - Display Reports
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Recent Privacy Scans
            </h1>
            <p className="mt-2 text-gray-600">
              Browse all publicly available privacy scans from our community
            </p>
          </div>

          {/* Stats Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{items.length}</span> recent {items.length === 1 ? 'scan' : 'scans'}
            </div>
          </div>

          {/* Reports Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((report) => {
              const domain = report.domain;

              return (
                <div
                  key={report.slug}
                  onClick={() => navigate(`/r/${report.slug}`)}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/r/${report.slug}`);
                    }
                  }}
                  aria-label={`View privacy report for ${domain}`}
                >
                  <Card className="hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Domain + favicon */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                            alt=""
                            width="24"
                            height="24"
                            className="rounded"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate" title={domain}>
                            {domain}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {getRelativeTime(report.createdAt)} • {report.evidenceCount} checks
                          </p>
                        </div>
                      </div>

                      {/* Right: Grade badge */}
                      <div className="flex-shrink-0">
                        <GradeBadge score={report.score} size="md" showLabel={false} />
                      </div>
                    </div>

                    {/* View report button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/r/${report.slug}`);
                      }}
                      className="mt-4 w-full text-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                      aria-label={`View privacy report for ${domain}`}
                    >
                      View Report →
                    </button>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Call to Action */}
          <div className="mt-12 text-center bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Want to scan your own site?
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Use our free privacy scanner to analyze any website for trackers, cookies, and security issues. Get a detailed report in seconds.
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-advisor-600 hover:bg-advisor-700 active:bg-advisor-800 transition-all duration-200"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Start a New Scan
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
