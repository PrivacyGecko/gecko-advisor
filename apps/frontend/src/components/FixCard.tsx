import clsx from 'clsx';
import type { TopFixView } from '../lib/adapters/scan';

const SEVERITY_COLORS: Record<TopFixView['severity'], string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-blue-100 text-blue-800',
  info: 'bg-slate-100 text-slate-700',
};

export interface FixCardProps {
  fix: TopFixView;
}

export function FixCard({ fix }: FixCardProps) {
  return (
    <article className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">{fix.title}</h3>
        <span className={clsx('whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold uppercase', SEVERITY_COLORS[fix.severity])}>
          {fix.severity}
        </span>
      </div>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{fix.category}</p>
      {fix.whyItMatters && <p className="mt-3 text-sm text-slate-700">{fix.whyItMatters}</p>}
      {fix.howToFix && <p className="mt-2 text-sm font-medium text-slate-800">{fix.howToFix}</p>}
      {fix.references.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-security-blue">
          {fix.references.map((ref, index) => (
            <li key={ref.url ?? index}>
              <a className="underline" href={ref.url} target="_blank" rel="noreferrer">
                {ref.label ?? ref.url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
