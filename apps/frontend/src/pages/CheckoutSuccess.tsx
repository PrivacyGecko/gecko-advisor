/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';

export default function CheckoutSuccess() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const customerName = useMemo(() => {
    if (!user?.email) return 'there';
    const [namePart] = user.email.split('@');
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  }, [user?.email]);

  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-8rem)] flex-col bg-gradient-to-b from-gecko-25 via-white to-white">
        <section className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full max-w-3xl rounded-3xl border border-gecko-100 bg-white/90 p-10 text-center shadow-xl backdrop-blur-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gecko-100 text-gecko-600">
              <CheckCircle2 className="h-10 w-10" aria-hidden />
            </div>
            <h1 className="mt-8 text-3xl font-semibold text-slate-900 sm:text-4xl">
              Welcome to Gecko Advisor Pro, {customerName}!
            </h1>
            <p className="mt-4 text-base text-slate-600">
              Your payment was processed successfully. We&apos;re activating your PRO features now—this only takes a few seconds.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-5 text-left">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Next steps</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>• Head to your dashboard to unlock unlimited scans.</li>
                  <li>• Run a new scan to see advanced privacy insights.</li>
                  <li>• Watch your inbox for a purchase confirmation once card payments go live.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-5 text-left">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Need help?</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>• PRO perks missing after a minute? Refresh and try Dashboard.</li>
                  <li>
                    • Still stuck? Reach us at{' '}
                    <a className="font-medium text-gecko-600 underline" href="mailto:support@geckoadvisor.com">
                      support@geckoadvisor.com
                    </a>
                    .
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gecko-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-gecko-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gecko-500 sm:w-auto"
              >
                Go to Dashboard
              </button>
              <Link
                to="/"
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto"
              >
                Explore public reports
              </Link>
            </div>

            <p className="mt-6 text-xs text-slate-400">
              Tip: bookmark this page or save your receipt for your records.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
