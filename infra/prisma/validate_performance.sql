-- Privacy Advisor Performance Validation Script
-- Run this after applying the performance optimizations to validate improvements

\timing on

-- ============================================================================
-- INDEX VERIFICATION
-- ============================================================================

\echo '=== VERIFYING NEW INDEXES ==='

SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'Scan_dedupe_lookup_idx',
  'Evidence_scan_covering_idx',
  'Issue_scan_covering_idx',
  'Scan_recent_reports_idx'
)
ORDER BY tablename, indexname;

-- ============================================================================
-- PERFORMANCE TEST QUERIES
-- ============================================================================

\echo '=== TESTING DEDUPE LOOKUP PERFORMANCE (Target: <50ms) ==='

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM "Scan"
WHERE "normalizedInput" = 'example.com'
  AND "status" = 'done'
  AND "finishedAt" >= NOW() - INTERVAL '24 hours'
ORDER BY "finishedAt" DESC
LIMIT 1;

\echo '=== TESTING EVIDENCE QUERY PERFORMANCE (Target: <100ms) ==='

-- Test with actual scan ID from database
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM "Evidence"
WHERE "scanId" = (SELECT id FROM "Scan" LIMIT 1)
ORDER BY "createdAt" ASC;

\echo '=== TESTING ISSUE QUERY PERFORMANCE (Target: <100ms) ==='

-- Test with actual scan ID from database
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM "Issue"
WHERE "scanId" = (SELECT id FROM "Scan" LIMIT 1)
ORDER BY "sortWeight" ASC, "createdAt" ASC;

\echo '=== TESTING RECENT REPORTS PERFORMANCE (Target: <200ms) ==='

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  "id", "slug", "input", "score", "label", "createdAt",
  (SELECT COUNT(*) FROM "Evidence" WHERE "scanId" = "Scan"."id") as evidence_count
FROM "Scan"
WHERE "status" = 'done'
ORDER BY "createdAt" DESC
LIMIT 10;

-- ============================================================================
-- INDEX USAGE STATISTICS
-- ============================================================================

\echo '=== INDEX USAGE STATISTICS ==='

SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as "Times Used",
  idx_tup_read as "Tuples Read",
  idx_tup_fetch as "Tuples Fetched"
FROM pg_stat_user_indexes
WHERE indexname LIKE '%covering_idx'
   OR indexname LIKE '%lookup_idx'
   OR indexname LIKE '%reports_idx'
ORDER BY tablename, indexname;

-- ============================================================================
-- TABLE STATISTICS
-- ============================================================================

\echo '=== TABLE SIZE AND ROW COUNTS ==='

SELECT
  schemaname,
  tablename,
  n_tup_ins as "Inserts",
  n_tup_upd as "Updates",
  n_tup_del as "Deletes",
  n_live_tup as "Live Rows",
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "Total Size"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- QUERY PERFORMANCE MONITORING
-- ============================================================================

\echo '=== SLOWEST QUERIES (if pg_stat_statements is enabled) ==='

-- This requires pg_stat_statements extension
-- Only run if the extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
    RAISE NOTICE 'pg_stat_statements extension is available';
    -- Show slowest queries related to our tables
    PERFORM 1;
  ELSE
    RAISE NOTICE 'pg_stat_statements extension not available - skipping query stats';
  END IF;
END $$;

-- ============================================================================
-- CONNECTION AND LOCK INFORMATION
-- ============================================================================

\echo '=== CURRENT DATABASE CONNECTIONS ==='

SELECT
  count(*) as "Total Connections",
  count(*) FILTER (WHERE state = 'active') as "Active",
  count(*) FILTER (WHERE state = 'idle') as "Idle",
  count(*) FILTER (WHERE state = 'idle in transaction') as "Idle in Transaction"
FROM pg_stat_activity
WHERE datname = current_database();

\echo '=== CURRENT LOCKS (should be minimal) ==='

SELECT
  locktype,
  relation::regclass,
  mode,
  granted,
  count(*)
FROM pg_locks
WHERE relation IS NOT NULL
GROUP BY locktype, relation, mode, granted
ORDER BY count(*) DESC
LIMIT 10;

-- ============================================================================
-- PERFORMANCE RECOMMENDATIONS
-- ============================================================================

\echo '=== PERFORMANCE VALIDATION COMPLETE ==='
\echo 'Expected Results:'
\echo '- Dedupe lookup: Should use Scan_dedupe_lookup_idx, execute in <50ms'
\echo '- Evidence queries: Should use Evidence_scan_covering_idx, execute in <100ms'
\echo '- Issue queries: Should use Issue_scan_covering_idx, execute in <100ms'
\echo '- Recent reports: Should use Scan_recent_reports_idx, execute in <200ms'
\echo ''
\echo 'If any query takes longer than expected:'
\echo '1. Check if indexes were created successfully'
\echo '2. Run ANALYZE on tables to update statistics'
\echo '3. Consider running VACUUM to reclaim space'
\echo '4. Verify query plans use the new indexes'

\timing off