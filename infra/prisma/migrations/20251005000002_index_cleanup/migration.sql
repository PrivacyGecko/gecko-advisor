-- Index Cleanup Migration
-- Migration: 20251005000002_index_cleanup
--
-- This migration removes redundant indexes after the performance optimizations
-- are validated and working correctly in production.
--
-- IMPORTANT: Only run this AFTER validating the performance improvements
-- from migration 20251005000001_critical_performance_optimizations

-- ==================================================
-- CLEANUP REDUNDANT INDEXES
-- ==================================================

-- Remove old normalized input index (replaced by dedupe_lookup_idx)
-- This was the incomplete index from earlier migration
DROP INDEX IF EXISTS "Scan_normalizedInput_idx";

-- Remove basic scanId indexes that are now covered by covering indexes
-- Keep this commented until we validate the covering indexes work properly
-- DROP INDEX IF EXISTS "Evidence_scanId_idx";
-- DROP INDEX IF EXISTS "Issue_scanId_idx";

-- ==================================================
-- VALIDATION NOTES
-- ==================================================

-- Before running this cleanup, validate that these queries perform well:
--
-- 1. Dedupe lookup (should use Scan_dedupe_lookup_idx):
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM "Scan"
-- WHERE "normalizedInput" = 'test.com'
--   AND "status" = 'done'
--   AND "finishedAt" >= NOW() - INTERVAL '1 day'
-- ORDER BY "finishedAt" DESC LIMIT 1;
--
-- 2. Evidence queries (should use Evidence_scan_covering_idx):
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM "Evidence"
-- WHERE "scanId" = 'test_id'
-- ORDER BY "createdAt" ASC;
--
-- 3. Issue queries (should use Issue_scan_covering_idx):
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM "Issue"
-- WHERE "scanId" = 'test_id'
-- ORDER BY "sortWeight" ASC, "createdAt" ASC;
--
-- Expected performance improvements:
-- - Dedupe lookups: < 50ms
-- - Evidence queries: < 100ms
-- - Issue queries: < 100ms
-- - Recent reports: < 200ms total