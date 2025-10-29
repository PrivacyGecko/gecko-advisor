/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export interface SeverityBadgeProps {
  /** Severity level from 1-5 */
  severity: number;
  /** Additional CSS classes */
  className?: string;
  /** Show descriptive text alongside severity level */
  showDescription?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * SeverityBadge component provides accessible severity level indication
 *
 * Features:
 * - WCAG AA compliant with text labels and semantic colors
 * - Screen reader support with detailed descriptions
 * - Pattern indicators for color-blind accessibility
 * - Consistent design system integration
 *
 * @param props - Component props
 * @returns JSX element representing the severity badge
 */
export default function SeverityBadge({
  severity,
  className = '',
  showDescription = false,
  size = 'md'
}: SeverityBadgeProps) {
  // Normalize severity to ensure valid range
  const normalizedSeverity = Math.max(1, Math.min(5, Math.round(severity)));

  const getSeverityConfig = (level: number) => {
    if (level >= 4) {
      return {
        level: 'high',
        label: 'High',
        description: 'High severity issue requiring immediate attention',
        bgClass: 'bg-privacy-danger-100',
        textClass: 'text-privacy-danger-800',
        borderClass: 'border-privacy-danger-300',
        icon: '⚠️',
        pattern: 'diagonal-lines'
      };
    }
    if (level === 3) {
      return {
        level: 'medium',
        label: 'Medium',
        description: 'Medium severity issue requiring attention',
        bgClass: 'bg-privacy-caution-100',
        textClass: 'text-privacy-caution-800',
        borderClass: 'border-privacy-caution-300',
        icon: '⚡',
        pattern: 'dots'
      };
    }
    return {
      level: 'low',
      label: 'Low',
      description: 'Low severity issue with minimal impact',
      bgClass: 'bg-slate-100',
      textClass: 'text-slate-700',
      borderClass: 'border-slate-300',
      icon: 'ℹ️',
      pattern: 'none'
    };
  };

  const config = getSeverityConfig(normalizedSeverity);
  const patternId = `severity-pattern-${config.level}-${React.useId()}`;

  // Size configurations
  const sizeConfig = {
    sm: {
      containerClass: 'px-1.5 py-0.5 text-2xs',
      iconSize: '10px',
      spacing: 'gap-1'
    },
    md: {
      containerClass: 'px-2 py-0.5 text-xs',
      iconSize: '12px',
      spacing: 'gap-1.5'
    },
    lg: {
      containerClass: 'px-3 py-1 text-sm',
      iconSize: '14px',
      spacing: 'gap-2'
    }
  };

  const sizeClasses = sizeConfig[size];

  return (
    <div className={`inline-flex items-center ${sizeClasses.spacing} ${className}`}>
      {/* SVG patterns for accessibility (only rendered when needed) */}
      {config.pattern !== 'none' && (
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            {config.pattern === 'diagonal-lines' && (
              <pattern
                id={patternId}
                x="0"
                y="0"
                width="4"
                height="4"
                patternUnits="userSpaceOnUse"
              >
                <rect width="4" height="4" fill="currentColor" fillOpacity="0.1" />
                <path
                  d="M0,4 L4,0"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  strokeOpacity="0.3"
                />
              </pattern>
            )}
            {config.pattern === 'dots' && (
              <pattern
                id={patternId}
                x="0"
                y="0"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
              >
                <rect width="6" height="6" fill="currentColor" fillOpacity="0.1" />
                <circle cx="3" cy="3" r="1" fill="currentColor" fillOpacity="0.4" />
              </pattern>
            )}
          </defs>
        </svg>
      )}

      <span
        className={`
          inline-flex items-center ${sizeClasses.spacing} ${sizeClasses.containerClass}
          rounded-full font-medium border
          ${config.bgClass} ${config.textClass} ${config.borderClass}
          relative overflow-hidden
        `}
        role="status"
        aria-label={`Severity level ${normalizedSeverity}: ${config.label}${showDescription ? `. ${config.description}` : ''}`}
        data-testid={`severity-badge-${config.level}`}
      >
        {/* Pattern overlay for accessibility */}
        {config.pattern !== 'none' && (
          <span
            className="absolute inset-0 opacity-20"
            style={{
              background: `url(#${patternId})`,
              pointerEvents: 'none'
            }}
            aria-hidden="true"
          />
        )}

        {/* Icon for visual distinction */}
        <span
          className="relative z-10"
          style={{ fontSize: sizeClasses.iconSize }}
          aria-hidden="true"
        >
          {config.icon}
        </span>

        {/* Severity level */}
        <span className="relative z-10 font-mono">
          Sev {normalizedSeverity}
        </span>

        {/* Optional descriptive text */}
        {showDescription && size !== 'sm' && (
          <span className="relative z-10 ml-1">
            ({config.label})
          </span>
        )}
      </span>

      {/* Screen reader description */}
      <span className="sr-only">
        Security severity level {normalizedSeverity} out of 5. {config.description}
      </span>
    </div>
  );
}

/**
 * SeverityIndicator is a simplified version for inline usage
 */
export function SeverityIndicator({ severity }: { severity: number }) {
  return (
    <SeverityBadge
      severity={severity}
      size="sm"
      showDescription={false}
    />
  );
}

/**
 * SeverityDescription provides a detailed view with full context
 */
export function SeverityDescription({ severity }: { severity: number }) {
  return (
    <SeverityBadge
      severity={severity}
      size="md"
      showDescription={true}
    />
  );
}