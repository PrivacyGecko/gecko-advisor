/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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

  // Track scan start time for timeout detection
  const [scanStartTime] = React.useState(() => Date.now());
  const [hasTimedOut, setHasTimedOut] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  // Track if we're experiencing rate limiting
  const isRateLimited = React.useMemo(() => {
    // Type guard for error with status property
    const httpError = error as Error & { status?: number };
    return isError && error && httpError.status === 429;
  }, [isError, error]);

  // Detect scan timeout (60 seconds)
  React.useEffect(() => {
    const checkTimeout = () => {
      const elapsedTime = Date.now() - scanStartTime;
      const TIMEOUT_MS = 60000; // 60 seconds

      // Only timeout if scan is still processing and hasn't completed
      if (elapsedTime >= TIMEOUT_MS && data?.status !== 'done' && data?.status !== 'error' && !isError) {
        setHasTimedOut(true);
      }
    };

    const interval = setInterval(checkTimeout, 1000);
    return () => clearInterval(interval);
  }, [scanStartTime, data?.status, isError]);

  // Redirect to report page when scan is complete using slug from API response
  React.useEffect(() => {
    if (data?.status === 'done' && data?.slug) {
      nav(`/r/${data.slug}`);
    }
  }, [data, nav]);

  // Retry handler - reloads the page with the same scan ID
  const handleRetry = React.useCallback(() => {
    if (retryCount >= 3) {
      // Max retries reached, redirect to home
      nav('/');
      return;
    }

    setRetryCount(prev => prev + 1);
    setHasTimedOut(false);
    refetch();
  }, [retryCount, refetch, nav]);

  // Determine if we should show an error state
  const shouldShowError = isError || hasTimedOut;

  return (
    <>
    <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-end text-sm">
        <a href="/docs" className="underline text-security-blue">Docs</a>
      </div>
      <h1 className="text-xl md:text-2xl font-bold">
        {shouldShowError
          ? (hasTimedOut ? "Scan Timed Out" : isRateLimited ? "Scan Temporarily Slowed" : "Scan Status Error")
          : data?.status === 'done'
            ? "Scan Complete"
            : "Privacy Scan In Progress"
        }
      </h1>
      <div
        className="text-base text-gray-700"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {data?.status === 'done'
          ? "Your privacy report is ready"
          : shouldShowError
            ? "There was an issue with your scan"
            : "Analyzing website privacy features..."}
      </div>
      <Card>
        {isLoading ? (
          <ProgressSkeleton />
        ) : shouldShowError ? (
          <ErrorState
            error={hasTimedOut ? new Error('Scan timed out') : (error || new Error('Failed to load scan status'))}
            title={hasTimedOut ? "Scan Timed Out" : isRateLimited ? "Scan Temporarily Slowed" : "Scan Status Error"}
            description={
              hasTimedOut
                ? "The scan is taking longer than expected. This might be due to website complexity or temporary connectivity issues. You can retry the scan or start a new one."
                : isRateLimited
                ? "We're checking your scan progress a bit slower to avoid overloading the server. Your scan is still running and will complete normally. This is temporary and will resolve automatically."
                : error?.message?.includes('Scan not found')
                ? "The scan ID could not be found. It may have expired or been deleted. Please start a new scan."
                : "There was an error checking the scan progress. This might be due to a network issue or a temporary server problem. The scan may still be running in the background."
            }
            onRetry={handleRetry}
            onGoHome={() => nav('/')}
            showDetails={process.env.NODE_ENV === 'development'}
          />
        ) : (
          <div className="py-4">
            <ScanProgress
              progress={data?.progress ?? (data?.status === 'done' ? 100 : 5)}
              status={data?.status === 'queued' ? 'pending' : data?.status === 'running' ? 'processing' : data?.status ?? 'processing'}
              currentStep={undefined}
              estimatedTimeRemaining={undefined}
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

      {/* Retry count indicator */}
      {retryCount > 0 && !shouldShowError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-center">
          <span className="font-medium text-amber-900">Retry attempt {retryCount} of 3</span>
        </div>
      )}
      <Link to="/" className="text-security-blue underline">New scan</Link>
    </main>
    <Footer />
    </>
  );
}
