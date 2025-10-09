/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Footer from '../components/Footer';

/**
 * Scan history item interface
 */
interface ScanHistoryItem {
  id: string;
  url: string;
  slug: string;
  score: number | null;
  status: 'pending' | 'in_progress' | 'done' | 'error';
  createdAt: string;
}

/**
 * Fetch scan history from API
 */
async function fetchScanHistory(token: string): Promise<ScanHistoryItem[]> {
  const response = await fetch('/api/scans/history', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch scan history');
  }

  const data = await response.json();
  return data.scans || [];
}

/**
 * Format date to relative time or absolute time
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Get score badge color classes
 */
function getScoreBadgeClasses(score: number): string {
  if (score >= 70) return 'bg-green-100 text-green-700';
  if (score >= 40) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

/**
 * Get status badge classes
 */
function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'done':
      return 'bg-green-100 text-green-700';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700';
    case 'error':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Get status label
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case 'done':
      return 'Completed';
    case 'in_progress':
      return 'Processing';
    case 'error':
      return 'Failed';
    case 'pending':
      return 'Pending';
    default:
      return status;
  }
}

/**
 * Dashboard Page Component
 * Shows user information and scan history
 *
 * Features:
 * - User profile section with subscription status
 * - Scan history table with scores and dates
 * - Empty state for no scans
 * - Upgrade CTA for free users
 * - API key display for Pro users
 * - Responsive design
 *
 * @example
 * <Route path="/dashboard" element={<Dashboard />} />
 */
export default function Dashboard() {
  const { user, token, isLoading: authLoading } = useAuth();

  // Query scan history
  const { data: scans, isLoading, error } = useQuery({
    queryKey: ['scan-history', token],
    queryFn: () => fetchScanHistory(token!),
    enabled: !!token,
    staleTime: 30000, // 30 seconds
  });

  // Redirect to home if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/" replace />;
  }

  const isPro = user?.subscription === 'PRO' || user?.subscription === 'TEAM';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">View your scan history and account details</p>
          </div>
          <Link
            to="/"
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-blue-600 text-white text-sm font-semibold',
              'hover:bg-blue-700 active:bg-blue-800',
              'transition-colors shadow-sm hover:shadow-md'
            )}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            New Scan
          </Link>
        </div>

        {/* User info card */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">
                  {user?.name ? user.name.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {user?.name || 'User'}
                </h2>
                <p className="text-sm text-gray-600">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={clsx(
                      'px-2 py-1 text-xs font-semibold rounded',
                      isPro
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    )}
                  >
                    {user?.subscription} {isPro && '✨'}
                  </span>
                  {user?.subscriptionStatus && (
                    <span className="text-xs text-gray-500">
                      {user.subscriptionStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!isPro && (
              <Link
                to="/pricing"
                className={clsx(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                  'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
                  'text-sm font-semibold',
                  'hover:from-amber-600 hover:to-amber-700',
                  'transition-all shadow-md hover:shadow-lg'
                )}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Upgrade to Pro
              </Link>
            )}
          </div>

          {/* API key section for Pro users */}
          {isPro && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">API Access</h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono text-gray-700">
                  {token?.substring(0, 40)}...
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(token || '');
                    alert('API key copied to clipboard!');
                  }}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Use this API key for automated scanning. See{' '}
                <Link to="/docs" className="text-blue-600 hover:underline">
                  documentation
                </Link>{' '}
                for details.
              </p>
            </div>
          )}
        </Card>

        {/* Scan history */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Scan History</h2>

          {isLoading ? (
            // Loading state
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            // Error state
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-gray-600 mb-4">Failed to load scan history</p>
              <button
                onClick={() => window.location.reload()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Try again
              </button>
            </div>
          ) : !scans || scans.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No scans yet</h3>
              <p className="text-gray-600 mb-6">
                Start your first privacy scan to see your history here
              </p>
              <Link
                to="/"
                className={clsx(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                  'bg-blue-600 text-white text-sm font-semibold',
                  'hover:bg-blue-700 active:bg-blue-800',
                  'transition-colors shadow-sm hover:shadow-md'
                )}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Start Scanning
              </Link>
            </div>
          ) : (
            // Scan table
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-3 text-sm font-semibold text-gray-700">URL</th>
                    <th className="pb-3 text-sm font-semibold text-gray-700 text-center">Score</th>
                    <th className="pb-3 text-sm font-semibold text-gray-700 text-center">Status</th>
                    <th className="pb-3 text-sm font-semibold text-gray-700">Date</th>
                    <th className="pb-3 text-sm font-semibold text-gray-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => (
                    <tr key={scan.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3">
                        <div className="max-w-xs truncate text-sm font-medium text-gray-900">
                          {scan.url}
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        {scan.score !== null ? (
                          <span className={clsx('px-2 py-1 rounded text-sm font-semibold', getScoreBadgeClasses(scan.score))}>
                            {scan.score}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <span className={clsx('px-2 py-1 rounded text-xs font-semibold', getStatusBadgeClasses(scan.status))}>
                          {getStatusLabel(scan.status)}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {formatDate(scan.createdAt)}
                      </td>
                      <td className="py-3 text-right">
                        {scan.status === 'done' && scan.slug ? (
                          <Link
                            to={`/r/${scan.slug}`}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            View Report →
                          </Link>
                        ) : scan.status === 'in_progress' ? (
                          <Link
                            to={`/scan/${scan.id}`}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            View Progress →
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Footer />
      </div>
    </div>
  );
}
