import { useState } from 'react';
import clsx from 'clsx';

export interface ShareBarProps {
  url: string;
  message?: string;
}

export function ShareBar({ url, message }: ShareBarProps) {
  const [status, setStatus] = useState<string | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Link copied to clipboard');
    } catch {
      setStatus('Copy failed. Please copy manually.');
    }
    timeoutClear();
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url, text: message, title: message });
        setStatus('Shared successfully');
        timeoutClear();
        return;
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
      }
    }
    copy().catch(() => undefined);
  };

  const timeoutClear = () => {
    window.setTimeout(() => setStatus(null), 2500);
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-slate-800">Share this report</span>
        <span className="break-all text-xs text-slate-500">{url}</span>
        {status && <span className="mt-1 text-xs text-gecko-600">{status}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={clsx(
            'inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold text-white shadow',
            'bg-security-blue hover:bg-security-blue-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-security-blue',
          )}
          onClick={share}
        >
          Share
        </button>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-security-blue"
          onClick={() => copy()}
        >
          Copy link
        </button>
      </div>
    </div>
  );
}
