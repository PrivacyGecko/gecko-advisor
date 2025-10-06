-- Post-Deployment Monitoring Queries
-- Critical Performance Optimizations Migration
--
-- Use these queries to monitor the database performance after migration deployment
-- Run these queries periodically to ensure the optimizations are working correctly

-- ==================================================
-- REAL-TIME PERFORMANCE MONITORING
-- ==================================================

-- Monitor 1: Active Query Performance
-- Shows currently running queries with their performance metrics
SELECT
    'active_queries' as metric_type,
    pid,
    usename,
    application_name,
    state,
    query_start,
    NOW() - query_start as duration,
    LEFT(query, 100) as query_preview
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT LIKE '%pg_stat_activity%'
  AND NOW() - query_start > INTERVAL '1 second'
ORDER BY query_start;

-- Monitor 2: Index Usage in Real-Time
-- Shows how frequently our new indexes are being used
SELECT
    'index_usage_realtime' as metric_type,
    schemaname,
    tablename,
    indexname,
    idx_scan as total_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    ROUND(
        idx_tup_fetch * 100.0 / NULLIF(idx_tup_read, 0),
        2
    ) as fetch_ratio_percent
FROM pg_stat_user_indexes
WHERE indexname IN (
    'Scan_dedupe_lookup_idx',
    'Evidence_scan_covering_idx',
    'Evidence_scanId_count_idx',
    'Issue_scan_covering_idx',
    'Scan_recent_reports_idx'
)
ORDER BY idx_scan DESC;

-- Monitor 3: Query Performance Statistics
-- Shows performance stats for critical queries
SELECT
    'query_performance' as metric_type,
    LEFT(query, 80) as query_type,
    calls,
    total_time,
    ROUND(mean_time::numeric, 2) as avg_time_ms,
    ROUND(max_time::numeric, 2) as max_time_ms,
    ROUND(min_time::numeric, 2) as min_time_ms,
    rows,
    ROUND((100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0))::numeric, 2) as buffer_hit_ratio
FROM pg_stat_statements
WHERE query ILIKE '%normalizedInput%'
   OR query ILIKE '%scanId%'
   OR query ILIKE '%Evidence%'
   OR query ILIKE '%Issue%'
ORDER BY mean_time DESC
LIMIT 20;

-- ==================================================
-- HOURLY PERFORMANCE TRENDS
-- ==================================================

-- Monitor 4: Performance Trend Analysis
-- Tracks performance trends over time (requires pg_stat_statements reset at regular intervals)
WITH performance_trends AS (
    SELECT
        'dedupe_queries' as query_type,
        COUNT(*) as query_count,
        ROUND(AVG(mean_time)::numeric, 2) as avg_response_time,
        ROUND(MAX(max_time)::numeric, 2) as max_response_time,
        ROUND(MIN(min_time)::numeric, 2) as min_response_time
    FROM pg_stat_statements
    WHERE query ILIKE '%normalizedInput%'
      AND query ILIKE '%status%'
      AND query ILIKE '%finishedAt%'

    UNION ALL

    SELECT
        'evidence_queries' as query_type,
        COUNT(*) as query_count,
        ROUND(AVG(mean_time)::numeric, 2) as avg_response_time,
        ROUND(MAX(max_time)::numeric, 2) as max_response_time,
        ROUND(MIN(min_time)::numeric, 2) as min_response_time
    FROM pg_stat_statements
    WHERE query ILIKE '%Evidence%'
      AND query ILIKE '%scanId%'

    UNION ALL

    SELECT
        'issue_queries' as query_type,
        COUNT(*) as query_count,
        ROUND(AVG(mean_time)::numeric, 2) as avg_response_time,
        ROUND(MAX(max_time)::numeric, 2) as max_response_time,
        ROUND(MIN(min_time)::numeric, 2) as min_response_time
    FROM pg_stat_statements
    WHERE query ILIKE '%Issue%'
      AND query ILIKE '%scanId%'
)
SELECT
    'performance_trends' as metric_type,
    query_type,
    query_count,
    avg_response_time,
    max_response_time,
    min_response_time,
    CASE
        WHEN avg_response_time < 50 AND query_type = 'dedupe_queries' THEN 'EXCELLENT'
        WHEN avg_response_time < 100 AND query_type IN ('evidence_queries', 'issue_queries') THEN 'EXCELLENT'
        WHEN avg_response_time < 100 AND query_type = 'dedupe_queries' THEN 'GOOD'
        WHEN avg_response_time < 200 AND query_type IN ('evidence_queries', 'issue_queries') THEN 'GOOD'
        WHEN avg_response_time < 200 AND query_type = 'dedupe_queries' THEN 'ACCEPTABLE'
        WHEN avg_response_time < 300 AND query_type IN ('evidence_queries', 'issue_queries') THEN 'ACCEPTABLE'
        ELSE 'POOR - INVESTIGATE'
    END as performance_status
FROM performance_trends
ORDER BY query_type;

-- ==================================================
-- DATABASE HEALTH MONITORING
-- ==================================================

-- Monitor 5: Buffer Cache Performance
SELECT
    'buffer_cache_metrics' as metric_type,
    'overall' as scope,
    ROUND(
        (SELECT SUM(blks_hit) FROM pg_stat_database) * 100.0 /
        NULLIF(
            (SELECT SUM(blks_hit) + SUM(blks_read) FROM pg_stat_database),
            0
        ),
        2
    ) as buffer_hit_ratio_percent,
    CASE
        WHEN ROUND(
            (SELECT SUM(blks_hit) FROM pg_stat_database) * 100.0 /
            NULLIF(
                (SELECT SUM(blks_hit) + SUM(blks_read) FROM pg_stat_database),
                0
            ),
            2
        ) > 95 THEN 'EXCELLENT'
        WHEN ROUND(
            (SELECT SUM(blks_hit) FROM pg_stat_database) * 100.0 /
            NULLIF(
                (SELECT SUM(blks_hit) + SUM(blks_read) FROM pg_stat_database),
                0
            ),
            2
        ) > 90 THEN 'GOOD'
        ELSE 'POOR - INVESTIGATE'
    END as status;

-- Monitor 6: Lock Contention Analysis
SELECT
    'lock_contention' as metric_type,
    mode,
    COUNT(*) as lock_count,
    COUNT(*) FILTER (WHERE NOT granted) as waiting_locks
FROM pg_locks
WHERE locktype = 'relation'
GROUP BY mode
HAVING COUNT(*) > 0
ORDER BY lock_count DESC;

-- Monitor 7: Index Efficiency Analysis
SELECT
    'index_efficiency' as metric_type,
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 10 THEN 'LOW_USAGE'
        WHEN idx_scan < 100 THEN 'MODERATE_USAGE'
        ELSE 'HIGH_USAGE'
    END as usage_level,
    CASE
        WHEN idx_scan = 0 AND pg_relation_size(indexrelid) > 1048576 THEN 'CONSIDER_DROPPING'
        WHEN idx_scan < 10 AND pg_relation_size(indexrelid) > 10485760 THEN 'REVIEW_NEEDED'
        ELSE 'OK'
    END as recommendation
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('Scan', 'Evidence', 'Issue')
ORDER BY pg_relation_size(indexrelid) DESC;

-- ==================================================
-- APPLICATION-SPECIFIC MONITORING
-- ==================================================

-- Monitor 8: Scan Processing Performance
-- Monitors the critical privacy advisor workflows
SELECT
    'scan_processing_metrics' as metric_type,
    COUNT(*) FILTER (WHERE status = 'done' AND finishedAt >= NOW() - INTERVAL '1 hour') as scans_completed_last_hour,
    COUNT(*) FILTER (WHERE status = 'processing') as scans_currently_processing,
    COUNT(*) FILTER (WHERE status = 'error') as scans_in_error,
    ROUND(
        AVG(EXTRACT(EPOCH FROM (finishedAt - startedAt))) FILTER (
            WHERE status = 'done'
            AND finishedAt >= NOW() - INTERVAL '1 hour'
            AND startedAt IS NOT NULL
        ),
        2
    ) as avg_processing_time_seconds,
    COUNT(*) FILTER (
        WHERE dedupeOfId IS NOT NULL
        AND createdAt >= NOW() - INTERVAL '1 hour'
    ) as dedupe_hits_last_hour
FROM "Scan";

-- Monitor 9: Evidence and Issue Volume Trends
SELECT
    'content_volume_metrics' as metric_type,
    'evidence' as content_type,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE createdAt >= NOW() - INTERVAL '1 hour') as created_last_hour,
    COUNT(*) FILTER (WHERE createdAt >= NOW() - INTERVAL '24 hours') as created_last_24h,
    ROUND(AVG(severity) FILTER (WHERE createdAt >= NOW() - INTERVAL '24 hours'), 2) as avg_severity_24h
FROM "Evidence"

UNION ALL

SELECT
    'content_volume_metrics' as metric_type,
    'issues' as content_type,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE createdAt >= NOW() - INTERVAL '1 hour') as created_last_hour,
    COUNT(*) FILTER (WHERE createdAt >= NOW() - INTERVAL '24 hours') as created_last_24h,
    NULL as avg_severity_24h
FROM "Issue";

-- ==================================================
-- ALERTING THRESHOLDS
-- ==================================================

-- Alert 1: Performance Degradation Detection
WITH performance_alerts AS (
    SELECT
        'performance_alert' as alert_type,
        query,
        mean_time,
        max_time,
        calls,
        CASE
            WHEN mean_time > 200 AND query ILIKE '%normalizedInput%' THEN 'CRITICAL - Dedupe queries too slow'
            WHEN mean_time > 300 AND (query ILIKE '%Evidence%' OR query ILIKE '%Issue%') THEN 'CRITICAL - Content queries too slow'
            WHEN max_time > 1000 THEN 'WARNING - Some queries taking over 1 second'
            ELSE NULL
        END as alert_message
    FROM pg_stat_statements
    WHERE (query ILIKE '%normalizedInput%' OR query ILIKE '%Evidence%' OR query ILIKE '%Issue%')
      AND calls > 10
)
SELECT *
FROM performance_alerts
WHERE alert_message IS NOT NULL
ORDER BY mean_time DESC;

-- Alert 2: Index Usage Anomalies
SELECT
    'index_alert' as alert_type,
    indexname,
    idx_scan,
    CASE
        WHEN indexname IN (
            'Scan_dedupe_lookup_idx',
            'Evidence_scan_covering_idx',
            'Issue_scan_covering_idx'
        ) AND idx_scan < 10 THEN 'WARNING - Critical index not being used'
        WHEN idx_scan = 0 AND pg_relation_size(indexrelid) > 10485760 THEN 'INFO - Large unused index'
        ELSE NULL
    END as alert_message
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('Scan', 'Evidence', 'Issue')
  AND (
    (indexname IN (
        'Scan_dedupe_lookup_idx',
        'Evidence_scan_covering_idx',
        'Issue_scan_covering_idx'
    ) AND idx_scan < 10)
    OR
    (idx_scan = 0 AND pg_relation_size(indexrelid) > 10485760)
  );

-- ==================================================
-- MONITORING AUTOMATION SCRIPTS
-- ==================================================

-- Script to reset pg_stat_statements for fresh monitoring periods
-- Run this at regular intervals (e.g., hourly) to track trends
-- SELECT pg_stat_statements_reset();

-- Script to update table statistics for optimal query planning
-- Run this after significant data changes
-- ANALYZE "Scan", "Evidence", "Issue";

-- ==================================================
-- USAGE INSTRUCTIONS
-- ==================================================

-- 1. Run performance monitoring queries every 15 minutes
-- 2. Review trends hourly during first 24 hours post-deployment
-- 3. Set up automated alerting based on the threshold queries
-- 4. Monitor buffer cache hit ratio continuously
-- 5. Check index usage patterns daily
-- 6. Reset pg_stat_statements weekly for trend analysis
-- 7. Run ANALYZE on tables after major data changes

-- ==================================================
-- ESCALATION CRITERIA
-- ==================================================

-- IMMEDIATE ESCALATION if:
-- - Average dedupe query time > 200ms
-- - Average evidence/issue query time > 300ms
-- - Buffer cache hit ratio < 90%
-- - Any critical index showing 0 usage after 1 hour
-- - Lock contention causing query timeouts
-- - Error rate increase > 10%

-- PLANNED ESCALATION if:
-- - Consistent performance degradation over 4 hours
-- - Index usage patterns changing unexpectedly
-- - Resource utilization trends concerning
-- - Application metrics showing user impact