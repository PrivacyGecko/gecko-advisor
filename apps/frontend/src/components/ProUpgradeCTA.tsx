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
const DISMISSED_KEY = 'gecko-advisor:pro-upgrade-cta-dismissed';

/**
 * Check if the CTA has been dismissed
 * @returns true if the CTA was previously dismissed
 */
function isDismissed(): boolean {
  try {
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (!dismissedAt) return false;

    // Auto-show again after 7 days
    const timestamp = parseInt(dismissedAt, 10);
    const daysSinceDismissed = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    return daysSinceDismissed < 7;
  } catch {
    // localStorage might be unavailable (private browsing, etc.)
    return false;
  }
}

/**
 * Set the dismissed state in localStorage with timestamp
 */
function setDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  } catch {
    // Fail silently if localStorage is unavailable
  }
}

/**
 * ProUpgradeCTA Component Props
 */
export interface ProUpgradeCTAProps {
  /**
   * Optional additional CSS classes to apply to the banner
   */
  className?: string;

  /**
   * Whether the user is already a PRO subscriber
   * If true, the component will not render
   */
  isPro?: boolean;
}

/**
 * ProUpgradeCTA Component
 *
 * Displays a dismissible PRO upgrade call-to-action banner on the report page.
 * Encourages FREE tier users to upgrade to PRO for private scans and unlimited usage.
 *
 * Features:
 * - Dismissible with localStorage persistence (re-appears after 7 days)
 * - Privacy-safe green gradient matching gecko brand colors
 * - Highlights key PRO benefits: private scans, unlimited scans, 90-day history, advanced insights
 * - Link to /pricing page
 * - WCAG AA accessible with proper ARIA labels
 * - Mobile-first responsive design
 * - Smooth fade-out animation on dismiss
 * - Lock icon and feature list for visual appeal
 *
 * Display Logic:
 * - Hidden for PRO users (isPro=true)
 * - Hidden if user previously dismissed it within last 7 days
 * - Positioned after summary cards but before evidence sections
 *
 * @example
 * ```tsx
 * // Basic usage (FREE user)
 * <ProUpgradeCTA />
 *
 * // With PRO check
 * <ProUpgradeCTA isPro={user?.isPro} />
 *
 * // With custom className
 * <ProUpgradeCTA className="my-6" />
 * ```
 *
 * @param props - Component props
 * @returns Upgrade CTA banner or null if dismissed/PRO user
 */
export default function ProUpgradeCTA({ className, isPro = false }: ProUpgradeCTAProps) {
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

  // Don't render if PRO user or dismissed
  if (isPro || dismissed) {
    return null;
  }

  return (
    <div
      className={clsx(
        'bg-gradient-to-r from-gecko-50 via-green-50 to-emerald-50',
        'border border-gecko-300 rounded-2xl shadow-lg',
        'transition-all duration-200',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        className
      )}
      role="region"
      aria-label="PRO subscription upgrade offer"
      data-testid="pro-upgrade-cta"
    >
      <div className="relative overflow-hidden p-5 md:p-6">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-gecko-200 rounded-full opacity-20 blur-2xl" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-emerald-200 rounded-full opacity-20 blur-2xl" aria-hidden="true" />

        <div className="relative flex items-start gap-4">
          {/* Lock Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-gecko-500 to-emerald-600 flex items-center justify-center shadow-md" aria-hidden="true">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header with dismiss button */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Keep Your Scans Private with PRO
                </h3>
                <p className="text-sm text-gray-700">
                  Unlimited scans, private results, and advanced insights for just <span className="font-bold text-gecko-700">$4.99/month</span>
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                className={clsx(
                  'flex-shrink-0 p-1.5 rounded-lg',
                  'text-gray-500 hover:text-gray-700 hover:bg-white/60',
                  'transition-colors duration-150',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-gecko-600 focus-visible:ring-offset-2'
                )}
                aria-label="Dismiss PRO upgrade offer"
                title="Remind me later"
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

            {/* Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {[
                { icon: '🔒', text: 'Private scan results' },
                { icon: '⚡', text: 'Unlimited scans' },
                { icon: '📊', text: '90-day history' },
                { icon: '🎯', text: 'Advanced insights' },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-gray-800"
                >
                  <span className="text-base" aria-hidden="true">{feature.icon}</span>
                  <span className="font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Link
              to="/pricing"
              className={clsx(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg',
                'bg-gradient-to-r from-gecko-600 to-emerald-600',
                'text-white text-sm font-bold',
                'hover:from-gecko-700 hover:to-emerald-700',
                'active:from-gecko-800 active:to-emerald-800',
                'transition-all duration-200',
                'shadow-md hover:shadow-lg',
                'transform hover:-translate-y-0.5',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gecko-600 focus-visible:ring-offset-2'
              )}
              aria-label="Upgrade to PRO subscription"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Upgrade to PRO
              <span className="ml-1" aria-hidden="true">→</span>
            </Link>

            {/* Privacy Badge */}
            <p className="text-xs text-gray-600 mt-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gecko-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Privacy-first. No tracking. Cancel anytime.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Utility function to clear the dismissed state (for testing or reset)
 * Can be called from browser console: window.clearProUpgradeCTA()
 */
export function clearDismissedState(): void {
  try {
    localStorage.removeItem(DISMISSED_KEY);
    console.log('[ProUpgradeCTA] Dismissed state cleared');
  } catch {
    console.warn('[ProUpgradeCTA] Could not clear dismissed state');
  }
}

// Export for console access in development
if (typeof window !== 'undefined') {
  (window as Window & { clearProUpgradeCTA?: () => void }).clearProUpgradeCTA = clearDismissedState;
}
