/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import clsx from 'clsx';

export interface SkeletonProps {
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Variant of the skeleton */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** Additional CSS classes */
  className?: string;
  /** Animation type */
  animation?: 'pulse' | 'wave' | 'none';
  /** Number of lines for text variant */
  lines?: number;
}

/**
 * Skeleton component for loading states
 *
 * Features:
 * - Multiple variants for different content types
 * - Accessible with proper ARIA labels
 * - Customizable animations
 * - Responsive design support
 * - Performance optimized with CSS animations
 */
const Skeleton = React.memo(function Skeleton({
  width = '100%',
  height = '1rem',
  variant = 'text',
  className = '',
  animation = 'pulse',
  lines = 1
}: SkeletonProps) {
  const baseClasses = clsx(
    'bg-gray-200 dark:bg-gray-700',
    {
      'animate-pulse': animation === 'pulse',
      'animate-bounce': animation === 'wave',
      'rounded-full': variant === 'circular',
      'rounded': variant === 'rounded',
      'rounded-none': variant === 'rectangular',
      'rounded-sm': variant === 'text'
    },
    className
  );

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  };

  // For text variant with multiple lines
  if (variant === 'text' && lines > 1) {
    return (
      <div
        role="status"
        aria-label="Loading content"
        className="space-y-2"
        data-testid="skeleton-text-multiline"
      >
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={clsx(baseClasses, {
              // Make last line shorter for realistic text appearance
              'w-3/4': index === lines - 1 && lines > 1
            })}
            style={{
              ...style,
              width: index === lines - 1 && lines > 1 ? '75%' : style.width
            }}
          />
        ))}
        <span className="sr-only">Loading content...</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading content"
      className={baseClasses}
      style={style}
      data-testid={`skeleton-${variant}`}
    >
      <span className="sr-only">Loading content...</span>
    </div>
  );
});

/**
 * Skeleton component specifically for score dials
 */
export const ScoreDialSkeleton = React.memo(function ScoreDialSkeleton({
  size = 'md',
  className = ''
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeConfig = {
    sm: { width: 80, height: 80 },
    md: { width: 120, height: 120 },
    lg: { width: 160, height: 160 }
  };

  const { width, height } = sizeConfig[size];

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <Skeleton
        variant="circular"
        width={width}
        height={height}
        animation="pulse"
        data-testid="score-dial-skeleton"
      />
      <div className="mt-2 space-y-1">
        <Skeleton width={60} height={20} variant="rounded" />
        <Skeleton width={80} height={14} variant="rounded" />
      </div>
    </div>
  );
});

/**
 * Skeleton component for evidence cards
 */
export const EvidenceCardSkeleton = React.memo(function EvidenceCardSkeleton({
  showExpandedContent = false,
  className = ''
}: {
  showExpandedContent?: boolean;
  className?: string;
}) {
  return (
    <div className={`p-4 border border-gray-200 rounded-lg space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton width={120} height={20} variant="text" />
        <Skeleton width={60} height={16} variant="rounded" />
      </div>

      <div className="flex items-start gap-3">
        <Skeleton width={20} height={20} variant="circular" />
        <div className="flex-1 space-y-2">
          <Skeleton width="80%" height={16} variant="text" />
          <Skeleton width={80} height={14} variant="rounded" />

          {showExpandedContent && (
            <div className="mt-3 space-y-2">
              <Skeleton width="100%" height={60} variant="rectangular" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * Skeleton component for card layouts
 */
export const CardSkeleton = React.memo(function CardSkeleton({
  className = '',
  children
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
      {children || (
        <div className="space-y-3">
          <Skeleton width={100} height={14} variant="text" />
          <Skeleton width={80} height={24} variant="text" />
          <Skeleton width={120} height={12} variant="text" />
        </div>
      )}
    </div>
  );
});

/**
 * Skeleton for progress indicators
 */
export const ProgressSkeleton = React.memo(function ProgressSkeleton({
  className = ''
}: {
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <Skeleton variant="circular" width={100} height={100} />
      <div className="text-center space-y-2">
        <Skeleton width={200} height={16} variant="text" />
        <div className="flex items-center gap-4">
          <Skeleton width={120} height={14} variant="rounded" />
          <Skeleton width={120} height={14} variant="rounded" />
          <Skeleton width={120} height={14} variant="rounded" />
        </div>
      </div>
    </div>
  );
});

export default Skeleton;