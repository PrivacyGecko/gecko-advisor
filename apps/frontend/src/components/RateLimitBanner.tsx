/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

/**
 * Rate limit information from scan response
 */
export interface RateLimitInfo {
  scansUsed: number;
  scansRemaining: number;
  resetAt: string;
}

export interface RateLimitBannerProps {
  rateLimit?: RateLimitInfo | null;
  isPro?: boolean;
}

/**
 * Format reset time to human-readable format
 * @param resetAt ISO timestamp
 * @returns Formatted time string (e.g., "5:30 PM" or "Tomorrow at 12:00 AM")
 */
function formatResetTime(resetAt: string): string {
  const resetDate = new Date(resetAt);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Check if reset is today
  if (resetDate.toDateString() === now.toDateString()) {
    return resetDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Check if reset is tomorrow
  if (resetDate.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${resetDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;
  }

  // Otherwise show full date
  return resetDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * RateLimitBanner Component
 * Displays rate limit status based on user subscription and current usage
 *
 * Display logic:
 * - Pro users: Show unlimited scans badge (gecko green)
 * - Free users with scans remaining: Show remaining count (blue)
 * - Free users at limit: Show upgrade CTA (red)
 *
 * @example
 * // Pro user
 * <RateLimitBanner isPro={true} />
 *
 * // Free user with scans remaining
 * <RateLimitBanner rateLimit={{ scansUsed: 1, scansRemaining: 2, resetAt: '2025-01-01T00:00:00Z' }} />
 *
 * // Free user at limit
 * <RateLimitBanner rateLimit={{ scansUsed: 3, scansRemaining: 0, resetAt: '2025-01-01T00:00:00Z' }} />
 */
export default function RateLimitBanner({ rateLimit, isPro = false }: RateLimitBannerProps) {
  // Pro users: Show unlimited badge
  if (isPro) {
    return (
      <div className="bg-gradient-to-r from-gecko-50 to-green-50 border border-gecko-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-5 h-5 text-gecko-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-semibold text-gecko-800">Pro: Unlimited Scans</span>
        </div>
      </div>
    );
  }

  // No rate limit info available
  if (!rateLimit) {
    return null;
  }

  const { scansRemaining, resetAt } = rateLimit;
  const resetTime = formatResetTime(resetAt);
  const hasScansRemaining = scansRemaining > 0;

  // Free user with scans remaining
  if (hasScansRemaining) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-gray-700">
            <span className="font-semibold text-blue-700">{scansRemaining}</span> scan{scansRemaining !== 1 ? 's' : ''} remaining today
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Resets at {resetTime}. Rate limits help us maintain service quality for everyone.
        </p>
      </div>
    );
  }

  // Free user at limit
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">Daily Limit Reached</h3>
          <p className="text-sm text-gray-600 mt-1">
            You've used all your scans today. Your limit resets at {resetTime}.
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Rate limits help us maintain service quality and prevent abuse. Thank you for using Gecko Advisor!
          </p>
        </div>
      </div>
    </div>
  );
}
