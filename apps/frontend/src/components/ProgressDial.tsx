/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export default function ProgressDial({ percent }: { percent: number }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const target = clamp(percent);
  const animatedValueRef = React.useRef(target);
  const [displayPercent, setDisplayPercent] = React.useState(target);
  const gradientId = React.useId();
  const blurId = React.useId();

  React.useEffect(() => {
    const start = animatedValueRef.current;
    const end = clamp(percent);
    if (start === end) {
      return;
    }

    const delta = end - start;
    const duration = Math.max(450, Math.abs(delta) * 15); // scale duration with distance travelled
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    let frameId: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      const value = start + delta * eased;
      setDisplayPercent(value);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        animatedValueRef.current = end;
        setDisplayPercent(end);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [percent]);

  const pct = clamp(displayPercent);
  const offset = circumference - (pct / 100) * circumference;
  const angle = (pct / 100) * 360;
  const radians = (angle - 90) * (Math.PI / 180);
  const indicatorX = 50 + r * Math.cos(radians);
  const indicatorY = 50 + r * Math.sin(radians);

  return (
    <svg width={140} height={140} viewBox="0 0 100 100" role="img" aria-label={`Scan progress ${Math.round(pct)} percent`} className="drop-shadow-sm">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="50%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <radialGradient id={`${gradientId}-inner`}>
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="80%" stopColor="#eff6ff" stopOpacity="0" />
        </radialGradient>
        <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Trail */}
      <circle cx="50" cy="50" r={r} stroke="#e2e8f0" strokeWidth={9} fill="none" strokeLinecap="round" />

      {/* Animated progress */}
      <circle
        cx="50"
        cy="50"
        r={r}
        stroke={`url(#${gradientId})`}
        strokeWidth={9}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 120ms linear' }}
        filter={`url(#${blurId})`}
      />

      {/* Progress indicator dot */}
      <circle
        cx={indicatorX}
        cy={indicatorY}
        r={3}
        fill="#14b8a6"
        className="animate-pulse"
        style={{ transition: 'all 200ms ease-out' }}
      />

      {/* Inner glow */}
      <circle cx="50" cy="50" r={r - 12} fill={`url(#${gradientId}-inner)`} opacity="0.2" />

      {/* Text */}
      <text x="50" y="48" textAnchor="middle" fontSize="14" fill="#64748b" fontWeight={500}>
        progress
      </text>
      <text x="50" y="62" textAnchor="middle" fontSize="24" fontWeight={700} fill="#0f172a">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}
