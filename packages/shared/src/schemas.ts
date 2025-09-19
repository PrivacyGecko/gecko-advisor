import { z } from "zod";

export const EvidenceKind = z.enum([
  'tracker',
  'cookie',
  'header',
  'insecure',
  'thirdparty',
  'policy',
  'tls',
  'fingerprint',
  'mixed-content',
]);

export const IssueSeverity = z.enum(['info', 'low', 'medium', 'high', 'critical']);

export const UrlScanRequestSchema = z.object({
  url: z.string().url().max(2048),
  force: z.boolean().optional(),
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
  slug: z.string(),
  deduped: z.boolean().optional(),
});

export const ScanStatusSchema = z.object({
  status: z.enum(['queued', 'running', 'done', 'error']),
  progress: z.number().min(0).max(100).optional(),
  score: z.number().min(0).max(100).optional(),
  label: z.enum(['Safe', 'Caution', 'High Risk']).optional(),
  slug: z.string().optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

export const EvidenceSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  kind: EvidenceKind,
  severity: z.number().int().min(1).max(5),
  title: z.string(),
  details: z.any(),
  createdAt: z.string().or(z.date()),
});

export const IssueReferenceSchema = z.object({
  label: z.string().max(120).optional(),
  url: z.string().url(),
});

export const IssueSchema = z.object({
  id: z.string(),
  key: z.string().optional(),
  category: z.string(),
  severity: IssueSeverity,
  title: z.string(),
  summary: z.string().optional(),
  howToFix: z.string().optional(),
  whyItMatters: z.string().optional(),
  references: z.array(IssueReferenceSchema).optional().default([]),
  sortWeight: z.number().optional(),
});

export const TopFixSchema = IssueSchema.pick({
  id: true,
  key: true,
  category: true,
  severity: true,
  title: true,
  howToFix: true,
  whyItMatters: true,
  references: true,
});

export const ScanSchema = z.object({
  id: z.string(),
  targetType: z.string(),
  input: z.string(),
  normalizedInput: z.string().nullable().optional(),
  status: z.string(),
  score: z.number().nullable().optional(),
  label: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  slug: z.string(),
  source: z.string().optional(),
  startedAt: z.string().or(z.date()).nullable().optional(),
  finishedAt: z.string().or(z.date()).nullable().optional(),
  shareMessage: z.string().nullable().optional(),
  meta: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

export const ReportResponseSchema = z.object({
  scan: ScanSchema,
  evidence: z.array(EvidenceSchema),
  issues: z.array(IssueSchema),
  topFixes: z.array(TopFixSchema),
  meta: z
    .object({
      dataSharing: z.enum(['None', 'Low', 'Medium', 'High']).optional(),
      domain: z.string().optional(),
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
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Issue = z.infer<typeof IssueSchema>;
export type TopFix = z.infer<typeof TopFixSchema>;
export type ReportResponse = z.infer<typeof ReportResponseSchema>;
export type RecentReportsResponse = z.infer<typeof RecentReportsResponseSchema>;
