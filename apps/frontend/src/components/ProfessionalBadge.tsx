/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

/**
 * ProfessionalBadge Component
 *
 * Displays professional capability indicators for Privacy Gecko.
 * Replaces "free forever" marketing with evidence of professional capabilities.
 *
 * Features:
 * - Four variants: open-source, standards, evidence-based, transparent
 * - Icon + text combination for visual appeal
 * - Professional color scheme (not marketing-focused)
 * - Responsive sizing: sm, md, lg
 * - WCAG AA accessible with proper ARIA labels
 *
 * @example
 * ```tsx
 * <ProfessionalBadge variant="open-source" size="md" />
 * <ProfessionalBadge variant="evidence-based" size="lg" />
 * ```
 */

export interface ProfessionalBadgeProps {
  /**
   * Badge variant determines icon, text, and color scheme
   */
  variant: 'open-source' | 'standards' | 'evidence-based' | 'transparent';

  /**
   * Size of the badge
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Additional CSS classes to apply
   */
  className?: string;
}

/**
 * Configuration for each badge variant
 * Includes icon SVG, display text, and color scheme
 */
const variantConfig = {
  'open-source': {
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    text: 'Open Source & Auditable',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-800',
  },
  'standards': {
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    text: 'WCAG AA Compliant',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
  },
  'evidence-based': {
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    text: 'Evidence-Based Analysis',
    bgColor: 'bg-advisor-100',
    textColor: 'text-advisor-800',
  },
  'transparent': {
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    text: 'Transparent Methodology',
    bgColor: 'bg-violet-100',
    textColor: 'text-violet-800',
  },
};

/**
 * Size configuration for responsive badge dimensions
 */
const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-5 py-2.5 text-lg',
};

/**
 * Icon size configuration for each badge size
 */
const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

/**
 * ProfessionalBadge Component
 * Displays a professional capability indicator
 */
export default function ProfessionalBadge({
  variant,
  size = 'md',
  className = ''
}: ProfessionalBadgeProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg font-medium ${config.bgColor} ${config.textColor} ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label={config.text}
      data-testid={`professional-badge-${variant}`}
    >
      <span className={iconSizes[size]} aria-hidden="true">
        {config.icon}
      </span>
      <span>{config.text}</span>
    </div>
  );
}
