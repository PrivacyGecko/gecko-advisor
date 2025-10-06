-- Privacy Advisor Database Optimization Migration
-- Performance improvements for sub-3-second response requirements
-- Migration: YYYY-MM-DD_performance_optimization

BEGIN;

-- 1. CRITICAL: Optimize scan lookups by slug with status filtering
-- Current issue: Single slug lookup then status check
-- Solution: Compound index for atomic slug+status queries
DROP INDEX IF EXISTS "Scan_slug_key";
CREATE UNIQUE INDEX CONCURRENTLY "Scan_slug_key" ON "Scan"("slug");
CREATE INDEX CONCURRENTLY "Scan_slug_status_idx" ON "Scan"("slug", "status")
  WHERE "status" IN ('done', 'processing', 'queued');

-- 2. CRITICAL: Optimize dedupe lookups (most frequent query)
-- Current issue: normalizedInput lookup with date range is slow
-- Solution: Compound index optimized for cache hit pattern
DROP INDEX IF EXISTS "Scan_normalizedInput_createdAt_idx";
CREATE INDEX CONCURRENTLY "Scan_dedupe_lookup_idx" ON "Scan"(
  "normalizedInput",
  "status",
  "finishedAt" DESC
) WHERE "status" = 'done' AND "finishedAt" IS NOT NULL;

-- 3. Optimize evidence and issues lookups by scanId
-- Current indexes are adequate, but add covering indexes for common selects
CREATE INDEX CONCURRENTLY "Evidence_scanId_covering_idx" ON "Evidence"(
  "scanId", "kind", "severity", "createdAt"
);

CREATE INDEX CONCURRENTLY "Issue_scanId_covering_idx" ON "Issue"(
  "scanId", "severity", "sortWeight", "createdAt"
);

-- 4. Optimize privacy list caching
-- Current issue: No indexing strategy for CachedList
-- Solution: Compound index for source+version lookup
CREATE UNIQUE INDEX CONCURRENTLY "CachedList_source_version_idx" ON "CachedList"("source", "version");
CREATE INDEX CONCURRENTLY "CachedList_fetchedAt_idx" ON "CachedList"("fetchedAt" DESC);

-- 5. Optimize recent scans query
-- Current issue: No index for status='done' with ordering
-- Solution: Partial index for completed scans
CREATE INDEX CONCURRENTLY "Scan_recent_done_idx" ON "Scan"("createdAt" DESC)
  WHERE "status" = 'done';

-- 6. Add partial index for active scans monitoring
CREATE INDEX CONCURRENTLY "Scan_active_status_idx" ON "Scan"("status", "startedAt", "createdAt")
  WHERE "status" IN ('queued', 'processing');

COMMIT;

-- Performance validation queries:
-- EXPLAIN ANALYZE SELECT * FROM "Scan" WHERE "slug" = 'abc123' AND "status" = 'done';
-- EXPLAIN ANALYZE SELECT * FROM "Scan" WHERE "normalizedInput" = 'https://example.com' AND "status" = 'done' AND "finishedAt" >= NOW() - INTERVAL '15 minutes' ORDER BY "finishedAt" DESC LIMIT 1;