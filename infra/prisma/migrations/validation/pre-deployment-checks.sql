-- Pre-Deployment Validation Checks
-- Critical Performance Optimizations Migration
--
-- Run these checks BEFORE deploying the migration to production
-- All checks must pass before proceeding with deployment

-- ==================================================
-- DATABASE HEALTH CHECKS
-- ==================================================

-- Check 1: Database connectivity and version
SELECT
    'database_version' as check_name,
    version() as value,
    CASE
        WHEN version() LIKE '%PostgreSQL 1%' THEN 'PASS'
        ELSE 'FAIL - Unsupported PostgreSQL version'
    END as status;

-- Check 2: Current database size and available space
SELECT
    'database_size' as check_name,
    pg_size_pretty(pg_database_size(current_database())) as value,
    'INFO' as status;

-- Check 3: Active connections count
SELECT
    'active_connections' as check_name,
    COUNT(*) as value,
    CASE
        WHEN COUNT(*) < 80 THEN 'PASS'
        WHEN COUNT(*) < 95 THEN 'WARN - High connection count'
        ELSE 'FAIL - Too many connections for safe migration'
    END as status
FROM pg_stat_activity
WHERE state = 'active';

-- Check 4: Long-running queries (should be minimal during migration)
SELECT
    'long_running_queries' as check_name,
    COUNT(*) as value,
    CASE
        WHEN COUNT(*) = 0 THEN 'PASS'
        WHEN COUNT(*) < 3 THEN 'WARN - Some long queries running'
        ELSE 'FAIL - Too many long queries for safe migration'
    END as status
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < NOW() - INTERVAL '5 minutes'
  AND query NOT LIKE '%pg_stat_activity%';

-- ==================================================
-- TABLE HEALTH CHECKS
-- ==================================================

-- Check 5: Table sizes and row counts
SELECT
    'table_stats' as check_name,
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    n_tup_ins + n_tup_upd + n_tup_del as total_operations,
    CASE
        WHEN pg_total_relation_size(schemaname||'.'||tablename) > 10737418240 THEN 'WARN - Large table (>10GB)'
        ELSE 'PASS'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN ('Scan', 'Evidence', 'Issue', 'CachedList')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check 6: Table bloat analysis
WITH table_bloat AS (
    SELECT
        tablename,
        ROUND(
            (pg_total_relation_size(schemaname||'.'||tablename) -
             pg_relation_size(schemaname||'.'||tablename)) * 100.0 /
            NULLIF(pg_total_relation_size(schemaname||'.'||tablename), 0),
            2
        ) as bloat_percentage
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND tablename IN ('Scan', 'Evidence', 'Issue')
)
SELECT
    'table_bloat' as check_name,
    tablename,
    bloat_percentage||'%' as value,
    CASE
        WHEN bloat_percentage < 20 THEN 'PASS'
        WHEN bloat_percentage < 40 THEN 'WARN - Moderate bloat'
        ELSE 'FAIL - Excessive bloat, consider VACUUM FULL'
    END as status
FROM table_bloat
ORDER BY bloat_percentage DESC;

-- ==================================================
-- INDEX HEALTH CHECKS
-- ==================================================

-- Check 7: Current index usage and effectiveness
SELECT
    'index_usage' as check_name,
    schemaname,
    tablename,
    indexname,
    idx_scan,
    CASE
        WHEN idx_scan > 100 THEN 'ACTIVE'
        WHEN idx_scan > 10 THEN 'LOW_USAGE'
        ELSE 'UNUSED'
    END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('Scan', 'Evidence', 'Issue')
ORDER BY tablename, idx_scan DESC;

-- Check 8: Conflicting indexes that might be affected
SELECT
    'potential_conflicts' as check_name,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('Scan', 'Evidence', 'Issue')
  AND (
    indexname LIKE '%normalizedInput%' OR
    indexname LIKE '%scanId%' OR
    indexname LIKE '%status%'
  )
ORDER BY tablename, indexname;

-- ==================================================
-- MIGRATION SAFETY CHECKS
-- ==================================================

-- Check 9: Ensure no existing locks that could block CONCURRENT index creation
SELECT
    'active_locks' as check_name,
    COUNT(*) as value,
    CASE
        WHEN COUNT(*) = 0 THEN 'PASS'
        WHEN COUNT(*) < 5 THEN 'WARN - Some locks present'
        ELSE 'FAIL - Too many locks for safe migration'
    END as status
FROM pg_locks
WHERE locktype = 'relation'
  AND mode IN ('AccessExclusiveLock', 'ShareLock')
  AND granted = true;

-- Check 10: Verify no pending DDL operations
SELECT
    'pending_ddl' as check_name,
    COUNT(*) as value,
    CASE
        WHEN COUNT(*) = 0 THEN 'PASS'
        ELSE 'FAIL - Pending DDL operations detected'
    END as status
FROM pg_stat_activity
WHERE query ILIKE '%CREATE INDEX%'
   OR query ILIKE '%DROP INDEX%'
   OR query ILIKE '%ALTER TABLE%';

-- ==================================================
-- DISK SPACE CHECKS
-- ==================================================

-- Check 11: Available disk space for index creation
-- Note: This is an estimate based on table sizes
WITH space_estimate AS (
    SELECT
        SUM(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND tablename IN ('Scan', 'Evidence', 'Issue')
)
SELECT
    'space_requirement' as check_name,
    pg_size_pretty(total_size * 0.3) as estimated_space_needed,
    'INFO - Ensure at least this much free space available' as status
FROM space_estimate;

-- ==================================================
-- FINAL VALIDATION SUMMARY
-- ==================================================

-- Summary query to check if system is ready for migration
SELECT
    'migration_readiness' as check_name,
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM pg_stat_activity
            WHERE state = 'active'
              AND query_start < NOW() - INTERVAL '5 minutes'
              AND query NOT LIKE '%pg_stat_activity%'
        ) > 2 THEN 'NOT_READY - Long running queries detected'
        WHEN (
            SELECT COUNT(*)
            FROM pg_locks
            WHERE locktype = 'relation'
              AND mode IN ('AccessExclusiveLock', 'ShareLock')
              AND granted = true
        ) > 0 THEN 'NOT_READY - Active locks detected'
        WHEN (
            SELECT COUNT(*)
            FROM pg_stat_activity
            WHERE state = 'active'
        ) > 95 THEN 'NOT_READY - Too many connections'
        ELSE 'READY - System ready for migration'
    END as status;

-- ==================================================
-- MIGRATION PREREQUISITES CHECKLIST
-- ==================================================

-- Before proceeding with migration, ensure:
-- □ All health checks above show PASS or acceptable WARN status
-- □ Database backup has been completed and verified
-- □ Rollback script has been tested in staging environment
-- □ Application is in maintenance mode or low-traffic period
-- □ Monitoring systems are active and alerting is configured
-- □ Team is ready to execute rollback if needed
-- □ Performance baseline has been established
-- □ Sufficient disk space is available (see space_requirement above)