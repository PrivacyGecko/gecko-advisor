/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

type Props = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

export default function InfoPopover({ label, children, className }: Props) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div ref={ref} className={`relative inline-block ${className || ''}`}>
      <button
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full border text-xs text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-security-blue"
        title={label}
      >
        i
      </button>
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={label}
          className="absolute z-10 mt-2 w-64 p-3 rounded border bg-white shadow text-sm text-slate-700"
        >
          {children}
        </div>
      )}
    </div>
  );
}
