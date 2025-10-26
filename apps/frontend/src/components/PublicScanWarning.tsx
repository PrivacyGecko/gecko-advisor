/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

/**
 * Local storage key for dismissed state
 */
const DISMISSED_KEY = 'gecko-advisor:public-scan-warning-dismissed';

/**
 * Check if the warning has been dismissed
 * @returns true if the warning was previously dismissed
 */
function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    // localStorage might be unavailable (private browsing, etc.)
    return false;
  }
}

/**
 * Set the dismissed state in localStorage
 */
function setDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, 'true');
  } catch {
    // Fail silently if localStorage is unavailable
  }
}

/**
 * PublicScanWarning Component
 *
 * Displays a dismissible warning banner to FREE tier users informing them
 * that their scans are public by default and visible in Recent Reports.
 * Encourages upgrade to PRO for private scans.
 *
 * Features:
 * - Dismissible with localStorage persistence
 * - Privacy-caution amber/orange color scheme
 * - Link to /pricing page
 * - WCAG AA accessible with proper ARIA labels
 * - Mobile-first responsive design
 * - Smooth fade-out animation on dismiss
 *
 * Display Logic:
 * - Shown to all users (FREE tier users are most relevant)
 * - Hidden if user previously dismissed it (stored in localStorage)
 * - Can be force-shown by clearing localStorage
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PublicScanWarning />
 *
 * // With custom className
 * <PublicScanWarning className="my-4" />
 * ```
 *
 * @param props - Component props
 * @param props.className - Optional additional CSS classes
 * @returns Warning banner or null if dismissed
 */
export interface PublicScanWarningProps {
  /**
   * Optional additional CSS classes to apply to the banner
   */
  className?: string;
}

export default function PublicScanWarning({ className }: PublicScanWarningProps) {
  const [dismissed, setDismissedState] = useState(true); // Start as dismissed to avoid flash
  const [isVisible, setIsVisible] = useState(true); // For fade-out animation

  // Check dismissed state on mount
  useEffect(() => {
    setDismissedState(isDismissed());
  }, []);

  /**
   * Handle dismiss button click
   * Triggers fade-out animation then updates state
   */
  const handleDismiss = () => {
    setIsVisible(false);
    // Wait for animation to complete before setting dismissed state
    setTimeout(() => {
      setDismissed();
      setDismissedState(true);
    }, 200); // Match animation duration
  };

  // Don't render if dismissed
  if (dismissed) {
    return null;
  }

  return (
    <div
      className={clsx(
        'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-4',
        'transition-all duration-200',
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      data-testid="public-scan-warning"
    >
      <div className="flex items-start gap-3">
        {/* Warning Icon */}
        <svg
          className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-amber-900">
              <span className="inline-flex items-center gap-1.5" aria-label="Info">
                <span aria-hidden="true">ℹ️</span>
                <span>Scan results are publicly accessible to support privacy research and transparency.</span>
              </span>
            </p>

            {/* Dismiss Button */}
            <button
              onClick={handleDismiss}
              className={clsx(
                'flex-shrink-0 p-1 rounded-md',
                'text-amber-600 hover:text-amber-800 hover:bg-amber-100',
                'transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2'
              )}
              aria-label="Dismiss public scan warning"
              title="Dismiss this warning"
              type="button"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Additional Info */}
          <p className="text-xs text-amber-800 mt-2">
            <span className="font-semibold">Transparency note:</span> Scan results appear in Recent Reports
            to enable privacy research and help identify widespread tracking practices across the web.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Utility function to clear the dismissed state (for testing or reset)
 * Can be called from browser console: window.clearPublicScanWarning()
 */
export function clearDismissedState(): void {
  try {
    localStorage.removeItem(DISMISSED_KEY);
    console.log('[PublicScanWarning] Dismissed state cleared');
  } catch {
    console.warn('[PublicScanWarning] Could not clear dismissed state');
  }
}

// Export for console access in development
if (typeof window !== 'undefined') {
  (window as any).clearPublicScanWarning = clearDismissedState;
}
