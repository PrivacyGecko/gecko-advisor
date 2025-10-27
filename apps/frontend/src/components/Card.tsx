import React from 'react';
import { clsx } from 'clsx';

export default function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('bg-white rounded-2xl shadow-lg p-4', className)}>
      {children}
    </div>
  );
}

