/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/

import type React from 'react';
import { getGradeInfo, getGradeAriaLabel } from '../lib/grading';

/**
 * Props for the GradeBadge component
 */
interface GradeBadgeProps {
  /** Privacy score from 0-100 */
  score: number;
  /** Visual size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the label (Excellent, Good, etc.) */
  showLabel?: boolean;
  /** Optional CSS class names */
  className?: string;
}

/**
 * GradeBadge - Displays a letter grade (A-F) for a privacy score
 *
 * A reusable component that shows universally-recognized letter grades
 * with proper colors, emojis, and accessibility features.
 *
 * Features:
 * - Universal A-F grading system
 * - Color-coded by grade (green for A/B, blue for C, amber for D, red for F)
 * - Responsive sizing (sm, md, lg)
 * - Screen reader accessible with aria-label
 * - Tooltip with full score on hover
 *
 * @example
 * ```tsx
 * // Simple usage
 * <GradeBadge score={88} />
 *
 * // Small version without label
 * <GradeBadge score={88} size="sm" showLabel={false} />
 *
 * // Large with full label
 * <GradeBadge score={95} size="lg" showLabel={true} />
 * ```
 */
export function GradeBadge({
  score,
  size = 'md',
  showLabel = true,
  className = ''
}: GradeBadgeProps): React.ReactElement {
  const gradeInfo = getGradeInfo(score);

  // Size-specific styling
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2'
  };

  const emojiSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl'
  };

  const fontSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div
      className={`
        inline-flex items-center rounded-full font-bold border
        ${gradeInfo.colors.bg} ${gradeInfo.colors.text} ${gradeInfo.colors.border}
        ${sizeClasses[size]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      aria-label={getGradeAriaLabel(score)}
      title={`${gradeInfo.label}: ${score}/100`}
    >
      <span className={emojiSize[size]} aria-hidden="true">
        {gradeInfo.emoji}
      </span>
      <span className={fontSizes[size]}>Grade {gradeInfo.letter}</span>
      {showLabel && size !== 'sm' && (
        <span className={`${fontSizes[size]} font-normal`}>
          ({gradeInfo.label})
        </span>
      )}
    </div>
  );
}

export default GradeBadge;
