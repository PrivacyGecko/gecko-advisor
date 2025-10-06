-- ROLLBACK Migration for 20251005000001_critical_performance_optimizations
--
-- EMERGENCY ROLLBACK PROCEDURE
-- Only use this if the performance optimizations cause issues in production
--
-- IMPORTANT: Test this rollback script in staging first!

-- ==================================================
-- ROLLBACK PHASE 1: DROP NEW INDEXES
-- ==================================================

-- Drop the new performance indexes
DROP INDEX IF EXISTS "Scan_dedupe_lookup_idx";
DROP INDEX IF EXISTS "Evidence_scan_covering_idx";
DROP INDEX IF EXISTS "Evidence_scanId_count_idx";
DROP INDEX IF EXISTS "Issue_scan_covering_idx";
DROP INDEX IF EXISTS "Scan_recent_reports_idx";

-- ==================================================
-- ROLLBACK PHASE 2: RESTORE ORIGINAL INDEXES
-- ==================================================

-- Restore the original basic indexes that were working before
CREATE INDEX IF NOT EXISTS "Scan_normalizedInput_createdAt_idx"
ON "Scan" ("normalizedInput", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Evidence_scanId_idx"
ON "Evidence"("scanId");

CREATE INDEX IF NOT EXISTS "Issue_scanId_idx"
ON "Issue"("scanId");

-- Restore the basic status/finishedAt index
CREATE INDEX IF NOT EXISTS "Scan_status_finishedAt_idx"
ON "Scan" ("status", "finishedAt");

-- ==================================================
-- VALIDATION AFTER ROLLBACK
-- ==================================================

-- After rollback, these queries should still work (but may be slower):
--
-- 1. Dedupe lookup:
-- SELECT * FROM "Scan"
-- WHERE "normalizedInput" = 'test.com'
--   AND "status" = 'done'
--   AND "finishedAt" >= NOW() - INTERVAL '1 day'
-- ORDER BY "finishedAt" DESC LIMIT 1;
--
-- 2. Evidence queries:
-- SELECT * FROM "Evidence" WHERE "scanId" = 'test_id';
--
-- 3. Recent reports:
-- SELECT * FROM "Scan" WHERE "status" = 'done' ORDER BY "createdAt" DESC LIMIT 10;

-- ==================================================
-- POST-ROLLBACK MONITORING
-- ==================================================

-- After rollback, monitor these metrics:
-- - Query response times should return to pre-optimization levels
-- - No query failures should occur
-- - Application should function normally
--
-- If issues persist after rollback, the problem may not be index-related