import { z } from 'zod';

export const UrlScanRequestSchema = z.object({
  url: z.string().url().max(2048),
});

export const AppScanRequestSchema = z.object({
  appId: z.string().min(2).max(200),
});

export const AddressScanRequestSchema = z.object({
  address: z.string().min(4).max(200),
  chain: z.enum(['evm', 'solana']).default('evm'),
});

export const ScanQueuedResponseSchema = z.object({
  scanId: z.string(),
  reportSlug: z.string(),
});

export const ScanStatusSchema = z.object({
  status: z.enum(['queued', 'running', 'done', 'error']),
  progress: z.number().min(0).max(100).optional(),
  score: z.number().min(0).max(100).optional(),
  label: z.enum(['Safe', 'Caution', 'High Risk']).optional(),
});

export const EvidenceType = z.enum([
  'tracker',
  'cookie',
  'header',
  'insecure',
  'thirdparty',
  'policy',
  'tls',
  'fingerprint',
]);

export const EvidenceSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  type: EvidenceType,
  severity: z.number().int().min(1).max(5),
  title: z.string(),
  details: z.any(),
  createdAt: z.string().or(z.date()),
});

export const ScanSchema = z.object({
  id: z.string(),
  targetType: z.string(),
  input: z.string(),
  status: z.string(),
  score: z.number().nullable().optional(),
  label: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  reportSlug: z.string(),
});

export const ReportResponseSchema = z.object({
  scan: ScanSchema,
  evidence: z.array(EvidenceSchema),
  meta: z
    .object({
      dataSharing: z.enum(['None', 'Low', 'Medium', 'High']).optional(),
    })
    .optional(),
});

export const RecentReportItemSchema = z.object({
  slug: z.string(),
  score: z.number(),
  label: z.enum(['Safe', 'Caution', 'High Risk']).or(z.string()),
  domain: z.string(),
  createdAt: z.string().or(z.date()),
  evidenceCount: z.number().optional().default(0),
});

export const RecentReportsResponseSchema = z.object({
  items: z.array(RecentReportItemSchema),
});

export type UrlScanRequest = z.infer<typeof UrlScanRequestSchema>;
export type ScanQueuedResponse = z.infer<typeof ScanQueuedResponseSchema>;
export type ScanStatus = z.infer<typeof ScanStatusSchema>;
export type ReportResponse = z.infer<typeof ReportResponseSchema>;
export type RecentReportsResponse = z.infer<typeof RecentReportsResponseSchema>;
