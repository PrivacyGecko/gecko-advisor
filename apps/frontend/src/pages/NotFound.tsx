/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import Footer from '../components/Footer';

export default function NotFound() {
  return (
    <>
      <main className="max-w-3xl mx-auto p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-slate-600">The page you're looking for doesn't exist.</p>
        <a href="/" className="text-security-blue underline">Go home</a>
      </main>
      <Footer />
    </>
  );
}

