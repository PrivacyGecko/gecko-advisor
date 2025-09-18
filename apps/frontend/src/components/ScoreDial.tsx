import React from 'react';

export default function ScoreDial({ score }: { score: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={120} height={120} viewBox="0 0 100 100" role="img" aria-label={`Score ${score}`}>
      <circle cx="50" cy="50" r={r} stroke="#e5e7eb" strokeWidth={8} fill="none" />
      <circle
        cx="50"
        cy="50"
        r={r}
        stroke={color}
        strokeWidth={8}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="54" textAnchor="middle" fontSize="20" fontWeight={700} fill="#0f172a">{score}</text>
    </svg>
  );
}

