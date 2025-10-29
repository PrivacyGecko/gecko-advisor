/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

/**
 * TrustBadge Component Props
 */
export interface TrustBadgeProps {
  /** Badge variant - determines color scheme */
  variant: 'free' | 'no-account' | 'no-limits' | 'open-source' | 'privacy-first';
  /** Override text (optional, defaults based on variant) */
  text?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

/**
 * TrustBadge - Prominent badge for "Free Forever" messaging
 *
 * Design Specifications:
 * - Rounded-full pill shape for friendly, approachable feel
 * - High contrast colors meeting WCAG AA standards
 * - Icon + Text composition for clarity
 * - Semantic color coding (green=free, blue=no-account, purple=unlimited)
 * - Responsive sizing with appropriate touch targets
 *
 * Color Rationale:
 * - Green (#10B981/emerald-500): Freedom, openness, "go" signal
 * - Blue (#3B82F6/blue-500): Trust, reliability, professionalism
 * - Purple (#8B5CF6/violet-500): Premium quality without cost
 * - Dark backgrounds for emphasis, light backgrounds for subtlety
 *
 * Usage:
 * ```tsx
 * // Prominent hero badges
 * <TrustBadge variant="free" size="lg" />
 * <TrustBadge variant="no-account" size="lg" />
 * <TrustBadge variant="no-limits" size="lg" />
 *
 * // Feature section badges
 * <TrustBadge variant="open-source" size="md" />
 * <TrustBadge variant="privacy-first" size="md" />
 * ```
 *
 * @param props - Component props
 * @returns JSX element representing trust badge
 */
const TrustBadge = React.memo(function TrustBadge({
  variant,
  text,
  size = 'md',
  className = ''
}: TrustBadgeProps) {
  // Default text for each variant
  const defaultText = {
    'free': 'Open Source & Accessible',
    'no-account': 'Start Analyzing Immediately',
    'no-limits': 'Professional Grade',
    'open-source': 'Open Source & Auditable',
    'privacy-first': 'Privacy-First Analysis'
  };

  // Variant configurations with WCAG AA compliant colors
  const variantConfig = {
    'free': {
      // Professional green: Analysis capability, not "free tier"
      container: 'bg-advisor-600 text-white',
      lightContainer: 'bg-advisor-100 text-advisor-800',
      icon: (
        <svg className="flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    'no-account': {
      // Professional trust blue, not marketing
      container: 'bg-trust-600 text-white',
      lightContainer: 'bg-trust-100 text-trust-800',
      icon: (
        <svg className="flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    'no-limits': {
      // Professional sky blue (Privacy Gecko brand), not marketing purple
      container: 'bg-privacy-gecko-600 text-white',
      lightContainer: 'bg-privacy-gecko-100 text-privacy-gecko-800',
      icon: (
        <svg className="flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    'open-source': {
      // Professional charcoal (neutral, not marketing)
      container: 'bg-gecko-700 text-white',
      lightContainer: 'bg-gecko-100 text-gecko-800',
      icon: (
        <svg className="flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    },
    'privacy-first': {
      // Professional advisor green (safety, analysis)
      container: 'bg-advisor-600 text-white',
      lightContainer: 'bg-advisor-100 text-advisor-800',
      icon: (
        <svg className="flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    }
  };

  // Size configurations with touch-friendly targets
  const sizeConfig = {
    'sm': {
      padding: 'px-3 py-1.5',
      text: 'text-sm',
      iconSize: 'w-4 h-4',
      gap: 'gap-1.5'
    },
    'md': {
      padding: 'px-4 py-2',
      text: 'text-base',
      iconSize: 'w-5 h-5',
      gap: 'gap-2'
    },
    'lg': {
      padding: 'px-6 py-3',
      text: 'text-lg',
      iconSize: 'w-6 h-6',
      gap: 'gap-2.5'
    }
  };

  const config = variantConfig[variant];
  const sizing = sizeConfig[size];
  const displayText = text || defaultText[variant];

  // Use dark background for hero/prominent badges, light for feature sections
  const shouldUseDarkBg = size === 'lg';

  return (
    <div
      className={`
        inline-flex items-center
        ${sizing.gap}
        ${sizing.padding}
        ${shouldUseDarkBg ? config.container : config.lightContainer}
        rounded-full
        font-semibold
        ${sizing.text}
        shadow-sm
        transition-all duration-200
        ${className}
      `}
      role="status"
      aria-label={displayText}
    >
      <span className={sizing.iconSize} aria-hidden="true">
        {config.icon}
      </span>
      <span>{displayText}</span>
    </div>
  );
});

export default TrustBadge;
