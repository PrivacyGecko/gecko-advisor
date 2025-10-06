-- Performance Validation Queries for Critical Performance Optimizations
-- Migration: 20251005000001_critical_performance_optimizations
--
-- Run these queries BEFORE and AFTER the migration to validate performance improvements
-- Expected target response times:
-- - Dedupe lookups: < 50ms
-- - Evidence queries: < 100ms
-- - Issue queries: < 100ms
-- - Recent reports: < 200ms total

-- ==================================================
-- PRE-MIGRATION BASELINE TESTS
-- ==================================================

-- Test 1: Dedupe Lookup Performance (Target: < 50ms)
-- This is the most critical query for the Privacy Advisor application
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    "id", "slug", "input", "score", "label", "finishedAt"
FROM "Scan"
WHERE "normalizedInput" = 'example.com'
  AND "status" = 'done'
  AND "finishedAt" >= NOW() - INTERVAL '24 hours'
ORDER BY "finishedAt" DESC
LIMIT 1;

-- Test 2: Evidence Query Performance (Target: < 100ms)
-- Tests the covering index for evidence retrieval
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    "id", "kind", "severity", "title", "details", "createdAt"
FROM "Evidence"
WHERE "scanId" = (SELECT "id" FROM "Scan" WHERE "status" = 'done' LIMIT 1)
ORDER BY "createdAt" ASC;

-- Test 3: Issue Query Performance (Target: < 100ms)
-- Tests the covering index for issue retrieval with sorting
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    "id", "key", "severity", "category", "title", "summary",
    "howToFix", "whyItMatters", "references", "sortWeight"
FROM "Issue"
WHERE "scanId" = (SELECT "id" FROM "Scan" WHERE "status" = 'done' LIMIT 1)
ORDER BY "sortWeight" ASC, "createdAt" ASC;

-- Test 4: Recent Reports Performance (Target: < 200ms)
-- Tests the recent reports covering index
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    "id", "slug", "input", "score", "label", "createdAt"
FROM "Scan"
WHERE "status" = 'done'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Test 5: Evidence Count Performance (Target: < 50ms)
-- Tests efficient counting for report statistics
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT COUNT(*) as evidence_count
FROM "Evidence"
WHERE "scanId" = (SELECT "id" FROM "Scan" WHERE "status" = 'done' LIMIT 1);

-- Test 6: Issue Count by Severity (Target: < 100ms)
-- Tests severity-based queries for dashboard statistics
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT
    "severity",
    COUNT(*) as issue_count
FROM "Issue"
WHERE "scanId" IN (
    SELECT "id" FROM "Scan"
    WHERE "status" = 'done'
    ORDER BY "createdAt" DESC
    LIMIT 5
)
GROUP BY "severity"
ORDER BY "severity";

-- ==================================================
-- INDEX VALIDATION QUERIES
-- ==================================================

-- Check current indexes before migration
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('Scan', 'Evidence', 'Issue', 'CachedList')
ORDER BY tablename, indexname;

-- Check index usage statistics (run after some production traffic)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('Scan', 'Evidence', 'Issue')
ORDER BY tablename, idx_scan DESC;

-- ==================================================
-- POST-MIGRATION VALIDATION TESTS
-- ==================================================

-- After migration, re-run all the performance tests above and validate:
-- 1. Query plans show the new indexes are being used
-- 2. Execution times meet the target thresholds
-- 3. Buffer hits are high (> 95% for frequently accessed data)
-- 4. No table scans on large tables

-- Validate new indexes exist
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname IN (
    'Scan_dedupe_lookup_idx',
    'Evidence_scan_covering_idx',
    'Evidence_scanId_count_idx',
    'Issue_scan_covering_idx',
    'Scan_recent_reports_idx'
)
ORDER BY indexname;

-- ==================================================
-- PERFORMANCE MONITORING QUERIES
-- ==================================================

-- Query to monitor slow queries (run periodically in production)
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    rows
FROM pg_stat_statements
WHERE query LIKE '%Scan%'
   OR query LIKE '%Evidence%'
   OR query LIKE '%Issue%'
ORDER BY mean_time DESC
LIMIT 20;

-- Buffer cache hit ratio (should be > 95%)
SELECT
    'buffer_cache_hit_ratio' as metric,
    ROUND(
        (SELECT SUM(blks_hit) FROM pg_stat_database) * 100.0 /
        NULLIF(
            (SELECT SUM(blks_hit) + SUM(blks_read) FROM pg_stat_database),
            0
        ),
        2
    ) as percentage;

-- Index usage efficiency (unused indexes should be investigated)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('Scan', 'Evidence', 'Issue')
  AND idx_scan < 100  -- Potentially unused indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- ==================================================
-- VALIDATION SUCCESS CRITERIA
-- ==================================================

-- The migration is successful if:
-- 1. All performance tests meet target times
-- 2. New indexes are being used in query plans
-- 3. No degradation in other query performance
-- 4. Buffer cache hit ratio remains > 95%
-- 5. No blocking or deadlock issues observed
-- 6. Application functionality works correctly

-- ROLLBACK CRITERIA:
-- Rollback if ANY of these occur:
-- 1. Query performance degrades beyond acceptable levels
-- 2. New indexes are not being used effectively
-- 3. Blocking or deadlock issues arise
-- 4. Any application functionality breaks
-- 5. Database resource usage becomes problematic