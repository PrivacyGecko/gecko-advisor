import type { ScanHistoryEntry } from '../lib/history';

export interface RecentScansProps {
  entries: ScanHistoryEntry[];
}

export function RecentScans({ entries }: RecentScansProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
        Your latest scans will appear here once you run them.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <a
          key={entry.slug}
          href={`/r/${encodeURIComponent(entry.slug)}`}
          className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-security-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-security-blue"
        >
          <div>
            <p className="text-sm font-semibold text-slate-800 break-words">{entry.domain}</p>
            <p className="text-xs text-slate-500">{formatDate(entry.scannedAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-800">{entry.score ?? '—'}</p>
            <p className="text-xs text-slate-500">{entry.label ?? 'Pending'}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
