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
  const res = await fetch(`/api/scan/${id}/status`);
  if (!res.ok) throw new Error('Scan not found');
  return parseJson(res, ScanStatusSchema);
}

export async function getReport(slug: string) {
  const res = await fetch(`/api/report/${slug}`);
  if (!res.ok) throw new Error('Report not found');
  return parseJson(res, ReportResponseSchema);
}

export async function getRecentReports() {
  const res = await fetch('/api/reports/recent');
  if (!res.ok) throw new Error('Recent reports not found');
  return parseJson(res, RecentReportsResponseSchema);
}
