/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export default function ProgressDial({ percent }: { percent: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  const offset = c - (pct / 100) * c;
  return (
    <svg width={120} height={120} viewBox="0 0 100 100" role="img" aria-label={`Progress ${pct}%`}>
      <circle cx="50" cy="50" r={r} stroke="#e5e7eb" strokeWidth={8} fill="none" />
      <circle
        cx="50"
        cy="50"
        r={r}
        stroke={'#2563eb'}
        strokeWidth={8}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="54" textAnchor="middle" fontSize="20" fontWeight={700} fill="#0f172a">{pct}%</text>
    </svg>
  );
}
