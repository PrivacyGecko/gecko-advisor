/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export interface EnhancedTrustIndicatorProps {
  /** Icon element (SVG) */
  icon: React.ReactNode;
  /** Heading text */
  title: string;
  /** Description text */
  description: string;
  /** Color variant */
  variant: 'emerald' | 'blue' | 'amber';
  /** Additional CSS classes */
  className?: string;
}

/**
 * EnhancedTrustIndicator - Premium trust indicator card
 *
 * Premium Features:
 * - Gradient backgrounds (subtle, brand-appropriate)
 * - Icon containers with gradient fills and shadows
 * - Smooth hover state transitions (shadow + border)
 * - Background decoration (blurred circle element)
 * - Improved typography hierarchy
 * - Responsive padding and spacing
 * - 3D depth with multiple shadow layers
 *
 * Design Rationale:
 * - Gradients create visual interest without overwhelming
 * - Icon containers draw attention to key trust signals
 * - Hover states provide interactive feedback
 * - Background decoration adds subtle premium polish
 * - Color-coded variants reinforce message semantics
 *
 * @param props - Component props
 * @returns JSX element representing enhanced trust indicator
 */
const EnhancedTrustIndicator = React.memo(function EnhancedTrustIndicator({
  icon,
  title,
  description,
  variant,
  className = ''
}: EnhancedTrustIndicatorProps) {
  const variantConfig = {
    emerald: {
      gradient: 'bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-white',
      border: 'border-emerald-200 hover:border-emerald-300',
      iconGradient: 'from-emerald-500 to-emerald-600',
      iconShadow: 'shadow-lg shadow-emerald-500/30',
      titleColor: 'text-emerald-900',
      descColor: 'text-emerald-700',
      decorationBg: 'bg-emerald-200/30'
    },
    blue: {
      gradient: 'bg-gradient-to-br from-blue-50 via-blue-50/50 to-white',
      border: 'border-blue-200 hover:border-blue-300',
      iconGradient: 'from-blue-500 to-blue-600',
      iconShadow: 'shadow-lg shadow-blue-500/30',
      titleColor: 'text-blue-900',
      descColor: 'text-blue-700',
      decorationBg: 'bg-blue-200/30'
    },
    amber: {
      gradient: 'bg-gradient-to-br from-amber-50 via-amber-50/50 to-white',
      border: 'border-amber-200 hover:border-amber-300',
      iconGradient: 'from-amber-500 to-amber-600',
      iconShadow: 'shadow-lg shadow-amber-500/30',
      titleColor: 'text-amber-900',
      descColor: 'text-amber-700',
      decorationBg: 'bg-amber-200/30'
    }
  };

  const config = variantConfig[variant];

  return (
    <div
      className={`
        relative overflow-hidden
        flex items-start gap-3
        p-5 md:p-6
        rounded-xl
        border-2 ${config.border}
        ${config.gradient}
        shadow-sm hover:shadow-lg
        transition-all duration-300 ease-out
        ${className}
      `}
    >
      {/* Background decoration - subtle blurred circle */}
      <div
        className={`absolute -right-8 -top-8 w-24 h-24 ${config.decorationBg} rounded-full blur-2xl`}
        aria-hidden="true"
      />

      {/* Icon container with gradient and shadow */}
      <div className="flex-shrink-0 relative z-10">
        <div
          className={`
            w-12 h-12
            rounded-xl
            bg-gradient-to-br ${config.iconGradient}
            ${config.iconShadow}
            flex items-center justify-center
            transition-transform duration-300 ease-out
            group-hover:scale-105
          `}
        >
          <div className="text-white w-6 h-6">
            {icon}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative z-10">
        <div className={`font-semibold text-base ${config.titleColor} leading-snug`}>
          {title}
        </div>
        <p className={`text-sm ${config.descColor} mt-1.5 leading-relaxed`}>
          {description}
        </p>
      </div>
    </div>
  );
});

export default EnhancedTrustIndicator;
