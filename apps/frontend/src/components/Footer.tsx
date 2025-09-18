/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t mt-8 text-sm text-slate-600">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-wrap gap-4">
        <a className="hover:underline" href="/about">About / Credits</a>
        <a className="hover:underline" href="/terms.html">Terms</a>
        <a className="hover:underline" href="/privacy.html">Privacy</a>
        <a className="hover:underline" href="/NOTICE.md">Notice</a>
        <a className="hover:underline" href="/LICENSE-THIRD-PARTY.md">Licenses</a>
        <a className="hover:underline" href="mailto:contact@example.com">Contact</a>
      </div>
    </footer>
  );
}
