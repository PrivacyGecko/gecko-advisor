# Critical Performance Optimizations - Deployment Guide

## Overview

This guide covers the deployment of critical performance optimizations for the Privacy Advisor database. The optimizations target sub-3-second scan response times through strategic index improvements.

**Migration Files:**
- `20251005000001_critical_performance_optimizations` - Core performance indexes
- `20251005000002_index_cleanup` - Cleanup of redundant indexes
- `ROLLBACK_20251005000001_critical_performance_optimizations.sql` - Emergency rollback

**Performance Targets:**
- Dedupe lookups: < 50ms
- Evidence queries: < 100ms
- Issue queries: < 100ms
- Recent reports: < 200ms total

## Pre-Deployment Checklist

### 1. Environment Preparation

- [ ] **Backup Verification**: Ensure recent database backup exists and is verified
- [ ] **Staging Testing**: Migration has been tested in staging environment
- [ ] **Rollback Testing**: Rollback script has been validated in staging
- [ ] **Monitoring Setup**: Performance monitoring is active and alerting configured
- [ ] **Team Availability**: Database and application teams are available for support

### 2. System Health Validation

Run the pre-deployment checks:

```sql
-- Execute all checks in this file
\i /path/to/infra/prisma/migrations/validation/pre-deployment-checks.sql
```

**Required Status:**
- All health checks must show `PASS` or acceptable `WARN`
- No `FAIL` status allowed before proceeding
- Active connections < 80
- No long-running queries (> 5 minutes)
- No conflicting locks

### 3. Performance Baseline

Establish baseline performance metrics:

```sql
-- Run baseline performance tests
\i /path/to/infra/prisma/migrations/validation/performance-validation.sql
```

**Record baseline metrics for:**
- Dedupe lookup query time
- Evidence query time
- Issue query time
- Recent reports query time
- Current buffer cache hit ratio

## Deployment Procedure

### Phase 1: Pre-Migration Validation (10 minutes)

1. **Connect to Production Database**
   ```bash
   # Ensure you're connected to the correct database
   psql $DATABASE_URL
   ```

2. **Run Pre-Deployment Checks**
   ```sql
   \i infra/prisma/migrations/validation/pre-deployment-checks.sql
   ```

3. **Establish Performance Baseline**
   ```sql
   \i infra/prisma/migrations/validation/performance-validation.sql
   ```

4. **Verify Migration Files**
   ```bash
   # Confirm migration files are present and correct
   ls -la infra/prisma/migrations/20251005000001_critical_performance_optimizations/
   ls -la infra/prisma/migrations/20251005000002_index_cleanup/
   ls -la infra/prisma/migrations/ROLLBACK_20251005000001_critical_performance_optimizations.sql
   ```

### Phase 2: Critical Performance Migration (30-45 minutes)

**IMPORTANT**: This migration uses `CREATE INDEX CONCURRENTLY` to avoid blocking production traffic.

1. **Start Migration Monitoring**
   ```sql
   -- In a separate session, monitor progress
   SELECT
       query,
       state,
       query_start,
       NOW() - query_start as duration
   FROM pg_stat_activity
   WHERE query ILIKE '%CREATE INDEX%';
   ```

2. **Execute Primary Migration**
   ```bash
   cd infra
   npx prisma migrate deploy
   ```

3. **Monitor Index Creation Progress**
   ```sql
   -- Check index creation status
   SELECT
       schemaname,
       tablename,
       indexname,
       indexdef
   FROM pg_indexes
   WHERE indexname IN (
       'Scan_dedupe_lookup_idx',
       'Evidence_scan_covering_idx',
       'Evidence_scanId_count_idx',
       'Issue_scan_covering_idx',
       'Scan_recent_reports_idx'
   );
   ```

4. **Validate Index Creation**
   ```sql
   -- Ensure all 5 new indexes were created successfully
   SELECT COUNT(*) as created_indexes
   FROM pg_indexes
   WHERE indexname IN (
       'Scan_dedupe_lookup_idx',
       'Evidence_scan_covering_idx',
       'Evidence_scanId_count_idx',
       'Issue_scan_covering_idx',
       'Scan_recent_reports_idx'
   );
   -- Should return 5
   ```

### Phase 3: Performance Validation (15 minutes)

1. **Test New Index Performance**
   ```sql
   -- Run performance validation tests
   \i infra/prisma/migrations/validation/performance-validation.sql
   ```

2. **Validate Query Plans**
   ```sql
   -- Verify new indexes are being used
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT * FROM "Scan"
   WHERE "normalizedInput" = 'example.com'
     AND "status" = 'done'
     AND "finishedAt" >= NOW() - INTERVAL '24 hours'
   ORDER BY "finishedAt" DESC LIMIT 1;
   ```

3. **Performance Comparison**
   - Compare execution times with baseline
   - Verify buffer cache hit ratio remains > 95%
   - Confirm query plans show new index usage

### Phase 4: Application Testing (10 minutes)

1. **Functional Validation**
   - Test scan deduplication functionality
   - Verify report generation works correctly
   - Check recent reports page loads properly
   - Validate evidence and issue queries

2. **Performance Monitoring**
   ```sql
   -- Monitor query performance in real-time
   SELECT
       query,
       calls,
       total_time,
       mean_time,
       max_time
   FROM pg_stat_statements
   WHERE query LIKE '%Scan%'
      OR query LIKE '%Evidence%'
      OR query LIKE '%Issue%'
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

### Phase 5: Index Cleanup (Optional - 15 minutes)

**ONLY execute if Phase 4 validation is successful and performance is stable.**

1. **Deploy Cleanup Migration**
   ```bash
   # Only if performance validation is successful
   cd infra
   npx prisma migrate deploy
   ```

2. **Validate Cleanup**
   ```sql
   -- Verify redundant indexes were removed
   SELECT indexname
   FROM pg_indexes
   WHERE tablename IN ('Scan', 'Evidence', 'Issue')
     AND indexname IN (
       'Scan_normalizedInput_idx',
       'Scan_normalizedInput_createdAt_idx'
     );
   -- Should return 0 rows
   ```

## Success Criteria

The deployment is successful if ALL of the following are met:

### Performance Metrics
- [ ] Dedupe lookups: < 50ms (target achieved)
- [ ] Evidence queries: < 100ms (target achieved)
- [ ] Issue queries: < 100ms (target achieved)
- [ ] Recent reports: < 200ms (target achieved)
- [ ] Buffer cache hit ratio: > 95%

### Technical Validation
- [ ] All 5 new indexes created successfully
- [ ] Query plans show new indexes being used
- [ ] No blocking or deadlock issues
- [ ] Application functionality works correctly
- [ ] No error rate increase

### Monitoring
- [ ] Performance monitoring shows improved metrics
- [ ] Database resource usage within normal limits
- [ ] No alerts or warnings triggered

## Rollback Procedure

Execute rollback if ANY of the following occur:
- Performance degrades beyond acceptable levels
- Application functionality breaks
- Database resource issues arise
- Any critical errors occur

### Emergency Rollback Steps

1. **Immediate Rollback**
   ```sql
   -- Execute rollback script immediately
   \i infra/prisma/migrations/ROLLBACK_20251005000001_critical_performance_optimizations.sql
   ```

2. **Validate Rollback**
   ```sql
   -- Verify original indexes are restored
   SELECT indexname
   FROM pg_indexes
   WHERE tablename IN ('Scan', 'Evidence', 'Issue')
   ORDER BY tablename, indexname;
   ```

3. **Test Application**
   - Verify all functionality works
   - Confirm performance returns to baseline
   - Check for any residual issues

4. **Update Migration Status**
   ```bash
   # Mark migration as rolled back in Prisma
   cd infra
   npx prisma migrate resolve --rolled-back 20251005000001_critical_performance_optimizations
   ```

## Post-Deployment Monitoring

### 24-Hour Monitoring Period

Monitor these metrics for 24 hours after deployment:

1. **Query Performance**
   ```sql
   -- Check hourly performance stats
   SELECT
       DATE_TRUNC('hour', NOW()) as hour,
       COUNT(*) as query_count,
       AVG(mean_time) as avg_response_time,
       MAX(max_time) as max_response_time
   FROM pg_stat_statements
   WHERE query LIKE '%normalizedInput%'
      OR query LIKE '%scanId%'
   GROUP BY DATE_TRUNC('hour', NOW())
   ORDER BY hour DESC;
   ```

2. **Index Usage Statistics**
   ```sql
   -- Monitor index usage patterns
   SELECT
       indexname,
       idx_scan,
       idx_tup_read,
       idx_tup_fetch,
       pg_size_pretty(pg_relation_size(indexrelid)) as index_size
   FROM pg_stat_user_indexes
   WHERE indexname LIKE '%_idx'
   ORDER BY idx_scan DESC;
   ```

3. **Application Metrics**
   - Scan completion times
   - Error rates
   - User experience metrics
   - System resource usage

### Alert Thresholds

Set up alerts for:
- Query response time > 200ms (average)
- Error rate increase > 5%
- Buffer cache hit ratio < 95%
- Unusual lock contention
- Index scan efficiency degradation

## Troubleshooting

### Common Issues and Solutions

1. **Index Creation Taking Too Long**
   - Monitor `pg_stat_activity` for progress
   - Check for blocking queries
   - Verify sufficient disk space

2. **Query Performance Not Improved**
   - Check query plans are using new indexes
   - Verify statistics are up to date: `ANALYZE`
   - Consider parameter tuning

3. **Application Errors**
   - Check connection pool settings
   - Verify query syntax compatibility
   - Review application logs

4. **Resource Issues**
   - Monitor CPU and memory usage
   - Check disk I/O patterns
   - Review connection counts

## Contact Information

**Database Team**: [Contact Info]
**Application Team**: [Contact Info]
**On-Call Engineer**: [Contact Info]

**Escalation Path**:
1. Database Administrator
2. Senior Database Engineer
3. Infrastructure Manager

---

**Version**: 1.0
**Last Updated**: 2025-10-06
**Next Review**: After deployment completion