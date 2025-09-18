/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles.css';
import Home from './pages/Home';
import Scan from './pages/Scan';
import Report from './pages/ReportPage';
import Compare from './pages/Compare';
import Docs from './pages/Docs';
import About from './pages/About';
import NotFound from './pages/NotFound';

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/scan/:id', element: <Scan /> },
  { path: '/r/:slug', element: <Report /> },
  { path: '/compare', element: <Compare /> },
  { path: '/docs', element: <Docs /> },
  { path: '/about', element: <About /> },
  { path: '*', element: <NotFound /> },
]);

const qc = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
