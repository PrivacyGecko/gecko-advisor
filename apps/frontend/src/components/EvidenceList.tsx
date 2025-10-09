import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { EvidenceView } from '../lib/adapters/scan';

type SeverityFilter = 'all' | 'high' | 'medium' | 'low';

const FILTER_OPTIONS: Array<{ key: SeverityFilter; label: string; shortcut: string }> = [
  { key: 'all', label: 'All', shortcut: '1' },
  { key: 'high', label: 'High', shortcut: '2' },
  { key: 'medium', label: 'Med', shortcut: '3' },
  { key: 'low', label: 'Low', shortcut: '4' },
];

const PAGE_SIZE_DEFAULT = 6;

export interface EvidenceListProps {
  items: EvidenceView[];
  filter: SeverityFilter;
  onFilterChange: (filter: SeverityFilter) => void;
  pageSize?: number;
}

export function EvidenceList({ items, filter, onFilterChange, pageSize = PAGE_SIZE_DEFAULT }: EvidenceListProps) {
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => items.filter((item) => matchesFilter(item.severity, filter)), [items, filter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);

  useEffect(() => {
    setPage(0);
  }, [filter, items, pageSize]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if ((event.target as HTMLElement | null)?.tagName === 'INPUT' || (event.target as HTMLElement | null)?.tagName === 'TEXTAREA') return;
      const option = FILTER_OPTIONS.find((opt) => opt.shortcut === event.key);
      if (option) {
        event.preventDefault();
        onFilterChange(option.key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onFilterChange]);

  return (
    <section aria-label="Evidence" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Evidence severity filter">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.key}
            role="tab"
            aria-selected={filter === option.key}
            onClick={() => onFilterChange(option.key)}
            className={clsx(
              'px-3 py-1 rounded-full border text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-security-blue',
              filter === option.key ? 'bg-security-blue text-white border-security-blue' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
            )}
          >
            {option.label}
            <span className="ml-1 text-xs text-slate-500">[{option.shortcut}]</span>
          </button>
        ))}
        <span className="text-xs text-slate-500">Use keys 1-4 to switch views</span>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded border border-dashed border-slate-200 p-4 text-sm text-slate-600">No evidence found for this filter.</p>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-3">
            {pageItems.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.displayKind}{item.domain ? ` • ${item.domain}` : ''}</p>
                  </div>
                  <span className={clsx('inline-flex min-w-[44px] justify-center rounded-full px-2 py-1 text-xs font-semibold', severityBadge(item.severity))}>
                    Sev {item.severity}
                  </span>
                </div>
                <pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-700">
                  {formatDetails(item.details)}
                </pre>
                {item.url && (
                  <a href={item.url} className="mt-2 inline-flex text-sm font-medium text-security-blue underline" target="_blank" rel="noreferrer">
                    View source
                  </a>
                )}
              </li>
            ))}
          </ul>

          <Pager page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </section>
  );
}

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (next: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm" aria-label="Evidence pagination">
      <button
        type="button"
        className="min-w-[96px] rounded bg-white px-3 py-2 font-medium text-slate-700 shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-security-blue disabled:pointer-events-none disabled:opacity-60"
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={page === 0}
      >
        Previous
      </button>
      <span className="text-slate-600">Page {page + 1} of {totalPages}</span>
      <button
        type="button"
        className="min-w-[96px] rounded bg-white px-3 py-2 font-medium text-slate-700 shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-security-blue disabled:pointer-events-none disabled:opacity-60"
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
      >
        Next
      </button>
    </nav>
  );
}

function matchesFilter(severity: number, filter: SeverityFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'high') return severity >= 4;
  if (filter === 'medium') return severity === 3;
  return severity <= 2;
}

function severityBadge(severity: number): string {
  if (severity >= 4) return 'bg-red-100 text-red-700';
  if (severity === 3) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-200 text-slate-700';
}

function formatDetails(details: unknown): string {
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}
