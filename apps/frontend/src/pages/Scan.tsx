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
  const [sp] = useSearchParams();
  const slug = sp.get('slug') || '';
  const nav = useNavigate();
  const { data, isLoading, error, isError, refetch } = useQuery(scanStatusQueryOptions(id));

  React.useEffect(() => {
    if (data?.status === 'done' && slug) nav(`/r/${slug}`);
  }, [data]);

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
            title="Scan Status Error"
            description="There was an error checking the scan progress. This might be due to a network issue or the scan ID being invalid."
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
      <Link to="/" className="text-security-blue underline">New scan</Link>
      <Footer />
    </div>
  );
}
