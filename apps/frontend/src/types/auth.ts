/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Authentication and Rate Limiting Types
 * Shared interfaces for the frontend authentication system
 */

/**
 * User subscription tiers
 */
export type SubscriptionTier = 'FREE' | 'PRO' | 'TEAM';

/**
 * User interface matching backend User model
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  subscription: SubscriptionTier;
  subscriptionStatus?: string;
}

/**
 * Rate limit information from API responses
 */
export interface RateLimitInfo {
  scansUsed: number;
  scansRemaining: number;
  resetAt: string; // ISO timestamp
}

/**
 * Scan response from /api/v2/scan endpoint
 */
export interface ScanResponse {
  scanId: string;
  slug: string;
  statusUrl: string;
  resultsUrl: string;
  rateLimit?: RateLimitInfo | null;
}

/**
 * Scan history item from /api/scans/history endpoint
 */
export interface ScanHistoryItem {
  id: string;
  url: string;
  slug: string;
  score: number | null;
  status: 'pending' | 'in_progress' | 'done' | 'error';
  createdAt: string;
}

/**
 * Auth API response interfaces
 */
export interface AuthResponse {
  token: string;
  user: User;
}

export interface CreateAccountResponse {
  token: string;
  message: string;
}

/**
 * Auth API error response
 */
export interface AuthError {
  detail: string;
  status?: number;
  rateLimit?: RateLimitInfo;
}
