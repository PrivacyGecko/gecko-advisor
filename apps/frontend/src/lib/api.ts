import type { ZodSchema } from 'zod';
import {
  UrlScanRequestSchema,
  ScanQueuedResponseSchema,
  ScanStatusSchema,
  ReportResponseSchema,
  RecentReportsResponseSchema,
} from '@privacy-advisor/shared';

async function parseJson<T>(res: Response, schema: ZodSchema<T>): Promise<T> {
  const data = await res.json();
  return schema.parse(data);
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
  if (!res.ok) throw new Error('Scan not found');
  return parseJson(res, ScanStatusSchema);
}

/**
 * React Query configuration for scan status polling
 * Optimized for performance and reduced backend load
 */
export const scanStatusQueryOptions = (id: string) => ({
  queryKey: ['scan', id],
  queryFn: () => getScanStatus(id),
  // Polling configuration with smart intervals
  refetchInterval: (query: any) => {
    const data = query.state.data;
    if (!data) return 2000; // Initial fetch, check every 2s
    if (data.status === 'done') return false; // Stop polling when done
    if (data.status === 'error') return false; // Stop polling on error

    // Adaptive polling based on progress
    const progress = data.progress || 0;
    if (progress < 30) return 1500; // Fast polling during startup
    if (progress < 70) return 2000; // Normal polling during processing
    return 1000; // Fast polling near completion
  },
  // Cache configuration
  staleTime: 0, // Always consider stale for real-time updates
  gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes after unmount
  retry: (failureCount: number, error: any) => {
    // Don't retry 404 errors (scan not found)
    if (error.message?.includes('Scan not found')) return false;
    // Retry up to 3 times for other errors
    return failureCount < 3;
  },
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
  // Network status awareness
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
});

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
  retry: (failureCount: number, error: any) => {
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
