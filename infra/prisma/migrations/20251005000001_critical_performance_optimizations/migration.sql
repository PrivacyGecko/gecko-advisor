-- Critical Performance Optimizations for Privacy Advisor
-- Migration: 20251005000001_critical_performance_optimizations
--
-- CRITICAL FIXES:
-- 1. Optimize dedupe lookup performance (< 50ms target)
-- 2. Add covering indexes for evidence queries
-- 3. Fix N+1 query prevention in reports
-- 4. Add composite indexes for status queries
--
-- NOTE: This version is compatible with PostgreSQL 9.6+
-- INCLUDE clause removed for compatibility (requires PG 11+)

-- ==================================================
-- PHASE 1: CRITICAL DEDUPE OPTIMIZATION
-- ==================================================

-- Drop existing incomplete index
DROP INDEX IF EXISTS "Scan_normalizedInput_createdAt_idx";

-- Create optimized composite index for dedupe lookups
-- This handles the query in dedupe.ts: WHERE normalizedInput = ? AND status = 'done' AND finishedAt >= ?
-- Using CONCURRENT to avoid blocking production
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Scan_dedupe_lookup_idx"
ON "Scan" ("normalizedInput", "status", "finishedAt" DESC)
WHERE "normalizedInput" IS NOT NULL AND "status" = 'done';

-- ==================================================
-- PHASE 2: EVIDENCE QUERY OPTIMIZATION
-- ==================================================

-- Index for evidence queries in buildReportPayload
-- This covers: SELECT * FROM Evidence WHERE scanId = ? ORDER BY createdAt ASC
-- Note: Without INCLUDE, the index still helps but may need to access the table for other columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Evidence_scan_covering_idx"
ON "Evidence" ("scanId", "createdAt" ASC);

-- Optimize evidence counting for recent reports
-- This covers: SELECT COUNT(*) FROM Evidence WHERE scanId = ?
-- The scanId index already exists, but ensure it's optimal
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Evidence_scanId_count_idx"
ON "Evidence" ("scanId");

-- ==================================================
-- PHASE 3: ISSUE QUERY OPTIMIZATION
-- ==================================================

-- Index for issue queries in buildReportPayload
-- This covers: SELECT * FROM Issue WHERE scanId = ? ORDER BY sortWeight ASC, createdAt ASC
-- Note: Without INCLUDE, the index still helps but may need to access the table for other columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Issue_scan_covering_idx"
ON "Issue" ("scanId", "sortWeight" ASC, "createdAt" ASC);

-- ==================================================
-- PHASE 4: SCAN STATUS OPTIMIZATION
-- ==================================================

-- Optimize recent reports query: WHERE status = 'done' ORDER BY createdAt DESC LIMIT 10
-- Note: Without INCLUDE, the index still helps but may need to access the table for other columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Scan_recent_reports_idx"
ON "Scan" ("status", "createdAt" DESC)
WHERE "status" = 'done';

-- ==================================================
-- PHASE 5: CLEANUP OLD INDEXES
-- ==================================================

-- Remove redundant indexes after new ones are created
-- Note: This will be done in a separate migration to ensure safety

-- ==================================================
-- VALIDATION QUERIES
-- ==================================================

-- These queries can be used to validate the optimization worked:
--
-- 1. Test dedupe lookup performance:
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM "Scan"
-- WHERE "normalizedInput" = 'example.com'
--   AND "status" = 'done'
--   AND "finishedAt" >= NOW() - INTERVAL '24 hours'
-- ORDER BY "finishedAt" DESC
-- LIMIT 1;
--
-- 2. Test evidence query performance:
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM "Evidence"
-- WHERE "scanId" = 'example_scan_id'
-- ORDER BY "createdAt" ASC;
--
-- 3. Test recent reports performance:
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT "id", "slug", "input", "score", "label", "createdAt"
-- FROM "Scan"
-- WHERE "status" = 'done'
-- ORDER BY "createdAt" DESC
-- LIMIT 10;
