-- ENHANCED ROLLBACK PROCEDURES
-- Critical Performance Optimizations Migration
--
-- This file provides comprehensive rollback procedures with safety checks
-- and validation steps for emergency situations.

-- ==================================================
-- ROLLBACK SAFETY CHECKLIST
-- ==================================================

-- Before executing rollback, verify:
-- □ Current system state is problematic and requires rollback
-- □ Application teams have been notified
-- □ Database backup is available and verified
-- □ This rollback script has been reviewed by senior DBA
-- □ Monitoring systems are active to track rollback impact

-- ==================================================
-- PRE-ROLLBACK VALIDATION
-- ==================================================

-- Check 1: Verify current migration state
SELECT
    'migration_state' as check_type,
    COUNT(*) as new_indexes_present
FROM pg_indexes
WHERE indexname IN (
    'Scan_dedupe_lookup_idx',
    'Evidence_scan_covering_idx',
    'Evidence_scanId_count_idx',
    'Issue_scan_covering_idx',
    'Scan_recent_reports_idx'
);
-- Should return 5 if migration was applied

-- Check 2: Assess current system load
SELECT
    'system_load' as check_type,
    COUNT(*) as active_connections,
    COUNT(*) FILTER (WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes') as long_running_queries
FROM pg_stat_activity;

-- Check 3: Verify no critical operations in progress
SELECT
    'critical_operations' as check_type,
    COUNT(*) as blocking_operations
FROM pg_stat_activity
WHERE query ILIKE '%CREATE INDEX%'
   OR query ILIKE '%DROP INDEX%'
   OR query ILIKE '%REINDEX%'
   OR query ILIKE '%VACUUM%'
   OR query ILIKE '%CLUSTER%';

-- ==================================================
-- ROLLBACK PROCEDURE - PHASE 1: PREPARATION
-- ==================================================

-- Start transaction for safety (will be committed in phases)
BEGIN;

-- Create rollback log table for tracking
CREATE TEMP TABLE rollback_log (
    step_id SERIAL PRIMARY KEY,
    step_name TEXT NOT NULL,
    execution_time TIMESTAMP DEFAULT NOW(),
    status TEXT NOT NULL,
    details TEXT
);

-- Log rollback initiation
INSERT INTO rollback_log (step_name, status, details)
VALUES ('rollback_initiated', 'SUCCESS', 'Enhanced rollback procedure started');

-- ==================================================
-- ROLLBACK PROCEDURE - PHASE 2: DROP NEW INDEXES
-- ==================================================

-- Step 1: Drop performance optimization indexes one by one
-- This approach allows for granular rollback if issues occur

-- Drop dedupe lookup index
DO $$
BEGIN
    DROP INDEX IF EXISTS "Scan_dedupe_lookup_idx";
    INSERT INTO rollback_log (step_name, status, details)
    VALUES ('drop_dedupe_index', 'SUCCESS', 'Scan_dedupe_lookup_idx dropped');
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO rollback_log (step_name, status, details)
        VALUES ('drop_dedupe_index', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- Drop evidence covering index
DO $$
BEGIN
    DROP INDEX IF EXISTS "Evidence_scan_covering_idx";
    INSERT INTO rollback_log (step_name, status, details)
    VALUES ('drop_evidence_covering_index', 'SUCCESS', 'Evidence_scan_covering_idx dropped');
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO rollback_log (step_name, status, details)
        VALUES ('drop_evidence_covering_index', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- Drop evidence count index
DO $$
BEGIN
    DROP INDEX IF EXISTS "Evidence_scanId_count_idx";
    INSERT INTO rollback_log (step_name, status, details)
    VALUES ('drop_evidence_count_index', 'SUCCESS', 'Evidence_scanId_count_idx dropped');
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO rollback_log (step_name, status, details)
        VALUES ('drop_evidence_count_index', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- Drop issue covering index
DO $$
BEGIN
    DROP INDEX IF EXISTS "Issue_scan_covering_idx";
    INSERT INTO rollback_log (step_name, status, details)
    VALUES ('drop_issue_covering_index', 'SUCCESS', 'Issue_scan_covering_idx dropped');
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO rollback_log (step_name, status, details)
        VALUES ('drop_issue_covering_index', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- Drop recent reports index
DO $$
BEGIN
    DROP INDEX IF EXISTS "Scan_recent_reports_idx";
    INSERT INTO rollback_log (step_name, status, details)
    VALUES ('drop_recent_reports_index', 'SUCCESS', 'Scan_recent_reports_idx dropped');
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO rollback_log (step_name, status, details)
        VALUES ('drop_recent_reports_index', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- ==================================================
-- ROLLBACK PROCEDURE - PHASE 3: RESTORE ORIGINAL INDEXES
-- ==================================================

-- Step 2: Recreate original basic indexes
-- These provide basic functionality while we assess the situation

-- Restore normalized input index
DO $$
BEGIN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "Scan_normalizedInput_createdAt_idx"
    ON "Scan" ("normalizedInput", "createdAt" DESC);

    INSERT INTO rollback_log (step_name, status, details)
    VALUES ('restore_normalizedInput_index', 'SUCCESS', 'Basic normalizedInput index restored');
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO rollback_log (step_name, status, details)
        VALUES ('restore_normalizedInput_index', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- Restore evidence scanId index
DO $$
BEGIN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "Evidence_scanId_idx"
    ON "Evidence"("scanId");

    INSERT INTO rollback_log (step_name, status, details)
    VALUES ('restore_evidence_scanId_index', 'SUCCESS', 'Basic Evidence scanId index restored');
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO rollback_log (step_name, status, details)
        VALUES ('restore_evidence_scanId_index', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- Restore issue scanId index
DO $$
BEGIN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "Issue_scanId_idx"
    ON "Issue"("scanId");

    INSERT INTO rollback_log (step_name, status, details)
    VALUES ('restore_issue_scanId_index', 'SUCCESS', 'Basic Issue scanId index restored');
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO rollback_log (step_name, status, details)
        VALUES ('restore_issue_scanId_index', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- Restore basic status/finishedAt index
DO $$
BEGIN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS "Scan_status_finishedAt_idx"
    ON "Scan" ("status", "finishedAt");

    INSERT INTO rollback_log (step_name, status, details)
    VALUES ('restore_status_finishedAt_index', 'SUCCESS', 'Basic status/finishedAt index restored');
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO rollback_log (step_name, status, details)
        VALUES ('restore_status_finishedAt_index', 'ERROR', SQLERRM);
        RAISE;
END $$;

-- ==================================================
-- ROLLBACK PROCEDURE - PHASE 4: VALIDATION
-- ==================================================

-- Step 3: Validate rollback was successful

-- Check that new indexes are gone
INSERT INTO rollback_log (step_name, status, details)
SELECT
    'validate_new_indexes_removed',
    CASE WHEN COUNT(*) = 0 THEN 'SUCCESS' ELSE 'ERROR' END,
    'New indexes remaining: ' || COUNT(*)::text
FROM pg_indexes
WHERE indexname IN (
    'Scan_dedupe_lookup_idx',
    'Evidence_scan_covering_idx',
    'Evidence_scanId_count_idx',
    'Issue_scan_covering_idx',
    'Scan_recent_reports_idx'
);

-- Check that original indexes are restored
INSERT INTO rollback_log (step_name, status, details)
SELECT
    'validate_original_indexes_restored',
    CASE WHEN COUNT(*) >= 4 THEN 'SUCCESS' ELSE 'PARTIAL' END,
    'Original indexes restored: ' || COUNT(*)::text
FROM pg_indexes
WHERE indexname IN (
    'Scan_normalizedInput_createdAt_idx',
    'Evidence_scanId_idx',
    'Issue_scanId_idx',
    'Scan_status_finishedAt_idx'
);

-- Commit the rollback transaction
COMMIT;

-- ==================================================
-- POST-ROLLBACK VALIDATION TESTS
-- ==================================================

-- Test 1: Verify basic query functionality
-- This should work but may be slower than before
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Scan"
WHERE "normalizedInput" = 'test.example.com'
  AND "status" = 'done'
  AND "finishedAt" >= NOW() - INTERVAL '1 day'
ORDER BY "finishedAt" DESC
LIMIT 1;

-- Test 2: Verify evidence queries work
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Evidence"
WHERE "scanId" = (SELECT "id" FROM "Scan" WHERE "status" = 'done' LIMIT 1)
ORDER BY "createdAt" ASC;

-- Test 3: Verify issue queries work
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Issue"
WHERE "scanId" = (SELECT "id" FROM "Scan" WHERE "status" = 'done' LIMIT 1)
ORDER BY "sortWeight" ASC, "createdAt" ASC;

-- Test 4: Verify recent reports work
EXPLAIN (ANALYZE, BUFFERS)
SELECT "id", "slug", "input", "score", "label", "createdAt"
FROM "Scan"
WHERE "status" = 'done'
ORDER BY "createdAt" DESC
LIMIT 10;

-- ==================================================
-- ROLLBACK COMPLETION REPORT
-- ==================================================

-- Generate rollback summary report
SELECT
    'ROLLBACK SUMMARY REPORT' as report_type,
    COUNT(*) as total_steps,
    COUNT(*) FILTER (WHERE status = 'SUCCESS') as successful_steps,
    COUNT(*) FILTER (WHERE status = 'ERROR') as failed_steps,
    COUNT(*) FILTER (WHERE status = 'PARTIAL') as partial_steps
FROM rollback_log;

-- Detailed rollback log
SELECT
    step_id,
    step_name,
    execution_time,
    status,
    details
FROM rollback_log
ORDER BY step_id;

-- ==================================================
-- POST-ROLLBACK MONITORING SETUP
-- ==================================================

-- After rollback, monitor these metrics for 2 hours:

-- 1. Query performance (should return to pre-optimization baseline)
SELECT
    'post_rollback_performance' as metric_type,
    query,
    calls,
    total_time,
    ROUND(mean_time::numeric, 2) as avg_time_ms,
    ROUND(max_time::numeric, 2) as max_time_ms
FROM pg_stat_statements
WHERE query ILIKE '%normalizedInput%'
   OR query ILIKE '%scanId%'
ORDER BY mean_time DESC
LIMIT 10;

-- 2. Index usage (basic indexes should show usage)
SELECT
    'post_rollback_index_usage' as metric_type,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('Scan', 'Evidence', 'Issue')
  AND indexname LIKE '%_idx'
ORDER BY idx_scan DESC;

-- 3. System health check
SELECT
    'post_rollback_system_health' as metric_type,
    COUNT(*) as active_connections,
    COUNT(*) FILTER (WHERE state = 'active') as active_queries,
    COUNT(*) FILTER (WHERE waiting = true) as waiting_queries
FROM pg_stat_activity;

-- ==================================================
-- NOTIFICATION TEMPLATE
-- ==================================================

-- Use this template to notify teams about rollback completion:

/*
ROLLBACK COMPLETION NOTIFICATION

Database: Privacy Advisor Production
Migration: 20251005000001_critical_performance_optimizations
Rollback Time: [INSERT TIMESTAMP]
Duration: [INSERT DURATION]

ROLLBACK STATUS: [SUCCESS/PARTIAL/FAILED]

ACTIONS TAKEN:
- Dropped performance optimization indexes
- Restored original basic indexes
- Validated query functionality
- Confirmed system stability

CURRENT STATE:
- System functionality: [WORKING/DEGRADED/FAILED]
- Performance level: [BASELINE/DEGRADED]
- Index usage: [NORMAL/ABNORMAL]

NEXT STEPS:
1. Continue monitoring for 2 hours
2. Analyze root cause of original issues
3. Plan alternative optimization approach
4. Schedule follow-up review meeting

CONTACT: [DBA ON-CALL]
*/

-- ==================================================
-- EMERGENCY CONTACT INFORMATION
-- ==================================================

-- If rollback fails or causes additional issues:
-- 1. Database Team: [CONTACT INFO]
-- 2. Infrastructure Team: [CONTACT INFO]
-- 3. Emergency Escalation: [CONTACT INFO]

-- Emergency procedures:
-- 1. Restore from backup if all else fails
-- 2. Scale database resources if performance is critical
-- 3. Implement application-level mitigations

-- ==================================================
-- LESSONS LEARNED TEMPLATE
-- ==================================================

-- Document lessons learned for future migrations:
-- 1. What caused the need for rollback?
-- 2. How effective was the rollback procedure?
-- 3. What could be improved in the process?
-- 4. What additional safeguards are needed?
-- 5. How can similar issues be prevented?