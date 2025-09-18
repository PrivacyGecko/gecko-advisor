/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getScanStatus } from '../lib/api';
import Card from '../components/Card';
import ProgressDial from '../components/ProgressDial';
import Footer from '../components/Footer';

export default function Scan() {
  const { id = '' } = useParams();
  const [sp] = useSearchParams();
  const slug = sp.get('slug') || '';
  const nav = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['scan', id],
    queryFn: () => getScanStatus(id),
    refetchInterval: (q) => (q.state.data?.status === 'done' ? false : 1000),
  });

  React.useEffect(() => {
    if (data?.status === 'done' && slug) nav(`/r/${slug}`);
  }, [data]);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-end text-sm">
        <a href="/docs" className="underline text-security-blue">Docs</a>
      </div>
      <h1 className="text-2xl font-bold">Scanning in Progress</h1>
      <Card>
        {isLoading ? (
          <p>Starting…</p>
        ) : (
          <div className="flex flex-col items-center text-center gap-2">
            <ProgressDial percent={data?.progress ?? (data?.status === 'done' ? 100 : 45)} />
            <div className="text-slate-700">We’re checking trackers, SSL, and privacy risks.</div>
            {data?.status !== 'done' ? (
              <div className="flex items-center gap-4 text-sm mt-2">
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/> Secure connection</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/> Transparent scan</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/> No data stored</span>
              </div>
            ) : (
              <button onClick={() => nav(-1)} className="px-3 py-1 rounded bg-security-blue text-white">Back</button>
            )}
          </div>
        )}
      </Card>
      <Link to="/" className="text-security-blue underline">New scan</Link>
      <Footer />
    </div>
  );
}
