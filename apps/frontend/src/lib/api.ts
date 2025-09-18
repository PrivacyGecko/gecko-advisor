import { z } from 'zod';
import {
  UrlScanRequestSchema,
  ScanQueuedResponseSchema,
  ScanStatusSchema,
  ReportResponseSchema,
  RecentReportsResponseSchema,
} from '@privacy-advisor/shared';

async function json<T>(res: Response, schema: z.ZodSchema<T>): Promise<T> {
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
  return json(res, ScanQueuedResponseSchema);
}

export async function getScanStatus(id: string) {
  const res = await fetch(`/api/scan/${id}/status`);
  if (!res.ok) throw new Error('Scan not found');
  return json(res, ScanStatusSchema);
}

export async function getReport(slug: string) {
  const res = await fetch(`/api/report/${slug}`);
  if (!res.ok) throw new Error('Report not found');
  return json(res, ReportResponseSchema);
}

export async function getRecentReports() {
  const res = await fetch(`/api/reports/recent`);
  if (!res.ok) throw new Error('Recent not found');
  return json(res, RecentReportsResponseSchema);
}
