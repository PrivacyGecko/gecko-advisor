/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles.css';
import HomeRoute from './routes/index';
import ScanRoute from './routes/scan/[id]';
import ShareRoute from './routes/r/[slug]';
import Compare from './pages/Compare';
import Docs from './pages/Docs';
import About from './pages/About';
import NotFound from './pages/NotFound';
import { SentryErrorBoundary } from './sentry';

const router = createBrowserRouter([
  { path: '/', element: <HomeRoute /> },
  { path: '/scan/:id', element: <ScanRoute /> },
  { path: '/r/:slug', element: <ShareRoute /> },
  { path: '/compare', element: <Compare /> },
  { path: '/docs', element: <Docs /> },
  { path: '/about', element: <About /> },
  { path: '*', element: <NotFound /> },
]);

const qc = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <SentryErrorBoundary fallback={<ErrorFallback />}>
        <RouterProvider router={router} />
      </SentryErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);

function ErrorFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center text-slate-700">
      <div className="text-2xl font-semibold text-red-700">Something went wrong</div>
      <p>Please refresh the page or run a new scan.</p>
    </div>
  );
}
