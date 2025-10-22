/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { WalletProvider } from './contexts/WalletProvider';
import './lib/performance'; // Initialize performance monitoring
import './styles.css';

// Lazy load components for code splitting
const Home = React.lazy(() => import('./pages/Home'));
const Scan = React.lazy(() => import('./pages/Scan'));
const Report = React.lazy(() => import('./pages/ReportPage'));
const Compare = React.lazy(() => import('./pages/Compare'));
const Docs = React.lazy(() => import('./pages/Docs'));
const About = React.lazy(() => import('./pages/About'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <React.Suspense fallback={<PageLoader />}>
        <Home />
      </React.Suspense>
    )
  },
  {
    path: '/scan/:id',
    element: (
      <React.Suspense fallback={<PageLoader />}>
        <Scan />
      </React.Suspense>
    )
  },
  {
    path: '/r/:slug',
    element: (
      <React.Suspense fallback={<PageLoader />}>
        <Report />
      </React.Suspense>
    )
  },
  {
    path: '/compare',
    element: (
      <React.Suspense fallback={<PageLoader />}>
        <Compare />
      </React.Suspense>
    )
  },
  {
    path: '/docs',
    element: (
      <React.Suspense fallback={<PageLoader />}>
        <Docs />
      </React.Suspense>
    )
  },
  {
    path: '/about',
    element: (
      <React.Suspense fallback={<PageLoader />}>
        <About />
      </React.Suspense>
    )
  },
  {
    path: '/dashboard',
    element: (
      <React.Suspense fallback={<PageLoader />}>
        <Dashboard />
      </React.Suspense>
    )
  },
  {
    path: '/pricing',
    element: (
      <React.Suspense fallback={<PageLoader />}>
        <Pricing />
      </React.Suspense>
    )
  },
  {
    path: '/reset-password',
    element: (
      <React.Suspense fallback={<PageLoader />}>
        <ResetPassword />
      </React.Suspense>
    )
  },
  {
    path: '/settings',
    element: (
      <React.Suspense fallback={<PageLoader />}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Settings Coming Soon</h1>
            <p className="text-gray-600">Account settings page is under development.</p>
          </div>
        </div>
      </React.Suspense>
    )
  },
  {
    path: '*',
    element: (
      <React.Suspense fallback={<PageLoader />}>
        <NotFound />
      </React.Suspense>
    )
  },
]);

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && error.message.includes('4')) return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Global error caught:', error, errorInfo);
        }
        // In production, send to error reporting service
        // Example: Sentry.captureException(error, { extra: errorInfo });
      }}
    >
      <QueryClientProvider client={qc}>
        <WalletProvider>
          <AuthProvider>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#1e293b',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '12px 16px',
                  borderRadius: '8px',
                },
              }}
            />
            <RouterProvider router={router} />
          </AuthProvider>
        </WalletProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
