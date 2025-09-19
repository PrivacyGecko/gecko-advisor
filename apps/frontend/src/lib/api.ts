import { z, type ZodSchema } from 'zod';
import {
  UrlScanRequestSchema,
  ScanQueuedResponseSchema,
  ScanStatusSchema,
  ReportResponseSchema,
  RecentReportsResponseSchema,
  EvidenceSchema,
  ScanSchema,
  type ScanQueuedResponse,
  type ScanStatus,
  type ReportResponse,
  type RecentReportsResponse,
} from '@privacy-advisor/shared';

export type { ScanQueuedResponse, ScanStatus, ReportResponse, RecentReportsResponse };

const USE_API_V2 = (import.meta.env.VITE_USE_API_V2 ?? 'true') !== 'false';
const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN ?? '').replace(/\/$/, '');
const API_PREFIX = USE_API_V2 ? '/api/v2' : '/api/v1';
const API_SCAN_BASE = `${API_PREFIX}/scan`;
const API_REPORT_BASE = `${API_PREFIX}/report`;
const API_REPORTS_BASE = `${API_PREFIX}/reports`;

const jsonMimePattern = /application\/json/i;

const ReportMetaSchema = (ReportResponseSchema.shape.meta as z.ZodOptional<z.ZodTypeAny>).unwrap();

const LegacyScanQueuedResponseSchema = z.object({
  scanId: z.string(),
  reportSlug: z.string(),
  deduped: z.boolean().optional(),
});

const LegacyScanStatusSchema = z.object({
  status: ScanStatusSchema.shape.status,
  score: z.number().min(0).max(100).nullable().optional(),
  label: z.string().nullable().optional(),
  reportSlug: z.string().optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

const LegacyEvidenceSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  type: z.string(),
  severity: z.number().int(),
  title: z.string(),
  details: z.unknown(),
  createdAt: z.string().or(z.date()),
});

const LegacyReportResponseSchema = z.object({
  scan: ScanSchema.extend({
    reportSlug: z.string().optional(),
  }),
  evidence: z.array(LegacyEvidenceSchema),
  meta: z.record(z.unknown()).optional(),
});

const LegacyRecentReportsResponseSchema = z.object({
  items: z.array(
    z.object({
      reportSlug: z.string(),
      score: z.number(),
      label: z.string(),
      domain: z.string(),
      createdAt: z.string().or(z.date()),
    }),
  ),
});

export class ApiError extends Error {
  status: number;
  body?: unknown;
  retryAfterMs?: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const isApiV2Enabled = USE_API_V2;

function resolve(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!API_ORIGIN) return normalized;
  return `${API_ORIGIN}${normalized}`;
}

async function fetchJson<T extends z.ZodTypeAny>(path: string, schema: T, init?: RequestInit): Promise<z.infer<T>> {
  const response = await fetch(resolve(path), init);
  const contentType = response.headers.get('content-type') ?? '';
  let payload: unknown;
  let rawText: string | undefined;

  if (jsonMimePattern.test(contentType)) {
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
  } else if (response.status !== 204) {
    rawText = await response.text();
    if (rawText) {
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = rawText;
      }
    }
  }

  if (!response.ok) {
    const err = new ApiError(`Request failed with status ${response.status}`, response.status);
    err.body = payload ?? rawText;
    const retryAfterHeader = response.headers.get('Retry-After');
    if (retryAfterHeader) {
      const seconds = Number.parseInt(retryAfterHeader, 10);
      if (!Number.isNaN(seconds)) {
        err.retryAfterMs = seconds * 1000;
      }
    }
    if (payload && typeof payload === 'object') {
      const body = payload as Record<string, unknown>;
      if (typeof body.retryAfterMs === 'number') {
        err.retryAfterMs = body.retryAfterMs;
      }
      const detail = body.detail ?? body.title ?? body.error ?? body.message;
      if (typeof detail === 'string' && detail.trim().length > 0) {
        err.message = detail;
      }
    } else if (typeof rawText === 'string' && rawText.trim().length > 0) {
      err.message = rawText.trim();
    }
    throw err;
  }

  if (payload === undefined) {
    const fallback = schema.safeParse(undefined);
    if (fallback.success) {
      return fallback.data;
    }
    throw new Error('Unexpected empty response body');
  }

  return schema.parse(payload);
}

export async function startUrlScan(url: string, opts: { force?: boolean } = {}): Promise<ScanQueuedResponse> {
  const requestBody = UrlScanRequestSchema.parse({ url, force: opts.force });
  const init: RequestInit = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestBody),
  };

  if (USE_API_V2) {
    return fetchJson(`${API_SCAN_BASE}/url`, ScanQueuedResponseSchema, init);
  }

  const legacy = await fetchJson(`${API_SCAN_BASE}/url`, LegacyScanQueuedResponseSchema, init);
  return ScanQueuedResponseSchema.parse({
    scanId: legacy.scanId,
    slug: legacy.reportSlug,
    deduped: legacy.deduped,
  });
}

export async function getScanStatus(id: string): Promise<ScanStatus> {
  const path = `${API_SCAN_BASE}/${encodeURIComponent(id)}/status`;

  if (USE_API_V2) {
    return fetchJson(path, ScanStatusSchema);
  }

  const legacy = await fetchJson(path, LegacyScanStatusSchema);
  return ScanStatusSchema.parse({
    status: legacy.status,
    score: legacy.score ?? undefined,
    label: legacy.label ?? undefined,
    slug: legacy.reportSlug ?? undefined,
    updatedAt: legacy.updatedAt,
  });
}

export async function getReport(slug: string): Promise<ReportResponse> {
  const path = `${API_REPORT_BASE}/${encodeURIComponent(slug)}`;

  if (USE_API_V2) {
    return fetchJson(path, ReportResponseSchema);
  }

  const legacy = await fetchJson(path, LegacyReportResponseSchema);
  const { reportSlug, ...rest } = legacy.scan;
  const scan = ScanSchema.parse({
    ...rest,
    slug: rest.slug ?? reportSlug ?? legacy.scan.id,
  });

  const evidence = legacy.evidence.map((item) =>
    EvidenceSchema.parse({
      id: item.id,
      scanId: item.scanId,
      kind: item.type,
      severity: item.severity,
      title: item.title,
      details: item.details,
      createdAt: item.createdAt,
    }),
  );

  let meta: ReportResponse['meta'] = undefined;
  if (legacy.meta) {
    try {
      meta = ReportMetaSchema.parse(legacy.meta);
    } catch {
      meta = undefined;
    }
  }

  return ReportResponseSchema.parse({
    scan,
    evidence,
    issues: [],
    topFixes: [],
    meta,
  }) as ReportResponse;
}

export async function getRecentReports(): Promise<RecentReportsResponse> {
  const path = `${API_REPORTS_BASE}/recent`;

  if (USE_API_V2) {
    return fetchJson(path, RecentReportsResponseSchema);
  }

  const legacy = await fetchJson(path, LegacyRecentReportsResponseSchema);

  const items = legacy.items.map((item) => ({
    slug: item.reportSlug,
    score: item.score,
    label: item.label,
    domain: item.domain,
    createdAt: item.createdAt,
    evidenceCount: 0,
  }));

  return RecentReportsResponseSchema.parse({ items }) as RecentReportsResponse;
}








