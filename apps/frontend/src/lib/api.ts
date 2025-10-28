/*
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { ZodSchema } from 'zod';
import type { Query } from '@tanstack/react-query';
import {
  UrlScanRequestSchema,
  ScanQueuedResponseSchema,
  ScanStatusSchema,
  ReportResponseSchema, // Uses 'kind' field (correct after schema migration)
  RecentReportsResponseSchema,
  type ScanStatus,
} from '@privacy-advisor/shared';

/**
 * Custom error type with HTTP status code
 */
interface HttpError extends Error {
  status?: number;
}

/**
 * Export HttpError as ApiError for backwards compatibility
 */
export { HttpError as ApiError };

async function parseJson<T>(res: Response, schema: ZodSchema<T>): Promise<T> {
  const data = await res.json();
  try {
    return schema.parse(data);
  } catch (error) {
    // Log schema validation errors for debugging
    console.error('[API] Schema validation failed:', error);
    console.error('[API] Response data:', JSON.stringify(data, null, 2));
    console.error('[API] Schema used:', schema);
    throw error;
  }
}

export async function startUrlScan(url: string) {
  const body = UrlScanRequestSchema.parse({ url });
  const res = await fetch('/api/scan/url', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to start scan');
  return parseJson(res, ScanQueuedResponseSchema);
}

export async function getScanStatus(id: string) {
  const res = await fetch(`/api/scan/${id}/status`, {
    // Add cache control headers for better caching
    headers: {
      'Cache-Control': 'no-cache, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
  if (!res.ok) {
    // Handle rate limiting with specific error
    if (res.status === 429) {
      const error: HttpError = new Error('Rate limit exceeded');
      error.status = 429;
      throw error;
    }
    throw new Error('Scan not found');
  }
  return parseJson(res, ScanStatusSchema);
}

/**
 * React Query configuration for scan status polling
 * Optimized for performance and reduced backend load with exponential backoff
 *
 * Key improvements:
 * - Conservative base polling interval (2-3s) to avoid rate limiting
 * - Exponential backoff on 429 errors (2s → 4s → 8s → 15s max)
 * - Automatic reset to base interval on successful response
 * - Smart retry logic that distinguishes between rate limits and real errors
 */
export const scanStatusQueryOptions = (id: string) => {
  // Track consecutive rate limit errors for exponential backoff
  let consecutiveRateLimits = 0;
  let lastSuccessTime = Date.now();

  return {
    queryKey: ['scan', id],
    queryFn: () => getScanStatus(id),
    // Polling configuration with exponential backoff for rate limiting
    refetchInterval: (query: Query<ScanStatus, Error>) => {
      const data = query.state.data as ScanStatus | undefined;
      const error = query.state.error as HttpError | null;

      // Stop polling when scan is complete or failed
      if (data?.status === 'done') return false;
      if (data?.status === 'error') return false;

      // Implement exponential backoff for rate limiting
      if (error?.status === 429) {
        consecutiveRateLimits++;
        // Exponential backoff: 2s → 4s → 8s → 15s (max)
        const backoffInterval = Math.min(2000 * Math.pow(2, consecutiveRateLimits - 1), 15000);
        console.warn(`[Polling] Rate limited. Backing off to ${backoffInterval}ms. Attempt ${consecutiveRateLimits}`);
        return backoffInterval;
      }

      // Reset backoff counter on successful response
      if (data && !error) {
        if (consecutiveRateLimits > 0) {
          console.info('[Polling] Rate limit cleared. Resetting to normal interval.');
        }
        consecutiveRateLimits = 0;
        lastSuccessTime = Date.now();
      }

      // Conservative base polling intervals
      if (!data) return 2000; // Initial fetch, 2 second interval

      // Adaptive polling based on progress (more conservative than before)
      const progress = data.progress || 0;
      if (progress < 30) return 3000; // Slower during startup (3s)
      if (progress < 70) return 2500; // Normal polling during processing (2.5s)
      return 2000; // Faster near completion but still conservative (2s)
    },
    // Cache configuration
    staleTime: 0, // Always consider stale for real-time updates
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes after unmount
    retry: (failureCount: number, error: Error) => {
      const httpError = error as HttpError;
      // Don't retry 404 errors (scan not found)
      if (error.message?.includes('Scan not found')) return false;

      // For rate limit errors, allow unlimited retries (backoff handles the delay)
      if (httpError.status === 429) {
        // Only retry if we haven't been rate limited for too long (5 minutes max)
        const timeSinceLastSuccess = Date.now() - lastSuccessTime;
        if (timeSinceLastSuccess > 5 * 60 * 1000) {
          console.error('[Polling] Rate limited for too long. Stopping retries.');
          return false;
        }
        return true; // Keep retrying with exponential backoff
      }

      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex: number, error: Error) => {
      const httpError = error as HttpError;
      // For rate limits, use exponential backoff calculated in refetchInterval
      if (httpError.status === 429) {
        return Math.min(2000 * Math.pow(2, attemptIndex), 15000);
      }
      // For other errors, standard exponential backoff
      return Math.min(1000 * 2 ** attemptIndex, 5000);
    },
    // Network status awareness
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  };
};

export async function getReport(slug: string) {
  const res = await fetch(`/api/report/${slug}`);
  if (!res.ok) throw new Error('Report not found');
  return parseJson(res, ReportResponseSchema);
}

/**
 * React Query configuration for report fetching
 * Optimized for caching completed reports
 */
export const reportQueryOptions = (slug: string) => ({
  queryKey: ['report', slug],
  queryFn: () => getReport(slug),
  // Cache completed reports for longer since they don't change
  staleTime: 10 * 60 * 1000, // 10 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
  retry: (failureCount: number, error: Error) => {
    // Don't retry 404 errors (report not found)
    if (error.message?.includes('Report not found')) return false;
    return failureCount < 2;
  },
  retryDelay: 1000,
  refetchOnWindowFocus: false, // Reports are static once generated
  refetchOnReconnect: false,
});

export async function getRecentReports() {
  const res = await fetch('/api/reports/recent');
  if (!res.ok) throw new Error('Recent reports not found');
  return parseJson(res, RecentReportsResponseSchema);
}
