/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { scanStatusQueryOptions } from '../lib/api';
import { ErrorState } from '../components/ErrorBoundary';
import Card from '../components/Card';
import ScanProgress from '../components/ScanProgress';
import { ProgressSkeleton } from '../components/Skeleton';
import Footer from '../components/Footer';

export default function Scan() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { data, isLoading, error, isError, refetch } = useQuery(scanStatusQueryOptions(id));

  // Track if we're experiencing rate limiting
  const isRateLimited = React.useMemo(() => {
    return isError && error && (error as any).status === 429;
  }, [isError, error]);

  // Redirect to report page when scan is complete using slug from API response
  React.useEffect(() => {
    if (data?.status === 'done' && data?.slug) {
      nav(`/r/${data.slug}`);
    }
  }, [data, nav]);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-end text-sm">
        <a href="/docs" className="underline text-security-blue">Docs</a>
      </div>
      <h1 className="text-xl md:text-2xl font-bold">Scanning in Progress</h1>
      <Card>
        {isLoading ? (
          <ProgressSkeleton />
        ) : isError ? (
          <ErrorState
            error={error || new Error('Failed to load scan status')}
            title={isRateLimited ? "Scan Temporarily Slowed" : "Scan Status Error"}
            description={
              isRateLimited
                ? "We're checking your scan progress a bit slower to avoid overloading the server. Your scan is still running and will complete normally. This is temporary and will resolve automatically."
                : error?.message?.includes('Scan not found')
                ? "The scan ID could not be found. It may have expired or been deleted. Please start a new scan."
                : "There was an error checking the scan progress. This might be due to a network issue or a temporary server problem. The scan may still be running in the background."
            }
            onRetry={() => refetch()}
            onGoHome={() => nav('/')}
            showDetails={process.env.NODE_ENV === 'development'}
          />
        ) : (
          <div className="py-4">
            <ScanProgress
              progress={data?.progress ?? (data?.status === 'done' ? 100 : 45)}
              status={data?.status ?? 'processing'}
              currentStep={data?.currentStep}
              estimatedTimeRemaining={data?.estimatedTimeRemaining}
            />

            {data?.status === 'done' && (
              <div className="text-center mt-6">
                <button
                  onClick={() => nav(-1)}
                  className="px-4 py-2 rounded-lg bg-security-blue text-white hover:bg-security-blue-dark transition-colors focus:outline-none focus:ring-2 focus:ring-security-blue focus:ring-offset-2"
                >
                  View Report
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Rate limit info banner - only show when experiencing rate limiting but still polling */}
      {isRateLimited && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 flex-shrink-0 text-xl" aria-hidden="true">ℹ️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Automatic Rate Limit Protection</h3>
              <p className="text-blue-800">
                We're automatically slowing down status checks to respect server limits.
                Your scan is still running normally. We'll automatically speed up again once the rate limit clears.
              </p>
            </div>
          </div>
        </div>
      )}
      <Link to="/" className="text-security-blue underline">New scan</Link>
      <Footer />
    </div>
  );
}
