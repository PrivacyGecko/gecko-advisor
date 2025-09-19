import clsx from 'clsx';
import type { ScoreBand } from '../lib/adapters/scan';

const BAND_STYLES: Record<ScoreBand, string> = {
  safe: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  risky: 'bg-amber-100 text-amber-800 border-amber-200',
  dangerous: 'bg-red-100 text-red-800 border-red-200',
  unknown: 'bg-slate-100 text-slate-600 border-slate-200',
};

export interface ScoreBadgeProps {
  score: number | null;
  band: ScoreBand;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, band, label, size = 'md' }: ScoreBadgeProps) {
  const displayScore = typeof score === 'number' ? Math.round(score) : '—';
  const sizeClasses = size === 'lg' ? 'text-2xl px-4 py-3' : size === 'sm' ? 'text-sm px-2 py-1.5' : 'text-base px-3 py-2';

  return (
    <div className={clsx('inline-flex min-w-[120px] flex-col items-center rounded-2xl border text-center shadow-sm', BAND_STYLES[band], sizeClasses)}>
      <div className="text-4xl font-bold">{displayScore}</div>
      <div className="text-sm font-medium uppercase tracking-wide">{label}</div>
    </div>
  );
}
