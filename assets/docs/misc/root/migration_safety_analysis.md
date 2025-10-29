# Migration Safety Analysis for Gecko Advisor

## Current Migration Patterns Assessment

### Migration History Review

1. **20250913190000_init**: Initial schema creation
   - **Risk Level**: LOW (initial setup)
   - **Safety**: ✅ Safe, no data impact

2. **20250919050000_phase1_schema**: Major schema changes
   - **Risk Level**: MEDIUM-HIGH
   - **Issues Identified**:
     - Column renames without proper validation
     - Foreign key additions without cleanup validation
     - Missing rollback procedures

3. **20250919063000_backend_indices**: Index management
   - **Risk Level**: MEDIUM
   - **Issues Identified**:
     - `DROP INDEX IF EXISTS` without `CONCURRENTLY`
     - Could cause brief locking on large tables

## Critical Migration Safety Issues

### Issue 1: Non-Concurrent Index Operations
**Current Problem**: Migrations use `CREATE INDEX` and `DROP INDEX` without `CONCURRENTLY`
**Impact**: Production table locking, potential downtime
**Solution**: Always use `CONCURRENTLY` for index operations

### Issue 2: No Migration Rollback Strategy
**Current Problem**: No documented rollback procedures
**Impact**: Cannot safely revert failed migrations
**Solution**: Create rollback scripts for each migration

### Issue 3: No Data Validation
**Current Problem**: Schema changes without data integrity validation
**Impact**: Silent data corruption risk
**Solution**: Add validation steps before/after schema changes

## Recommended Migration Safety Framework

### Pre-Migration Checklist
1. **Backup Validation**
   ```sql
   -- Verify backup exists and is recent
   SELECT pg_size_pretty(pg_database_size('privacy_advisor'));
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

2. **Lock Impact Assessment**
   ```sql
   -- Check table sizes to estimate lock duration
   SELECT
     schemaname,
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
     pg_stat_get_tuples_inserted(c.oid) as inserts,
     pg_stat_get_tuples_updated(c.oid) as updates
   FROM pg_tables pt
   JOIN pg_class c ON c.relname = pt.tablename
   WHERE schemaname = 'public';
   ```

3. **Connection Impact Analysis**
   ```sql
   -- Monitor active connections during migration window
   SELECT count(*), state FROM pg_stat_activity
   WHERE datname = 'privacy_advisor' GROUP BY state;
   ```

### Zero-Downtime Migration Pattern

```sql
-- Safe Migration Template
BEGIN;

-- 1. Create new indexes CONCURRENTLY (outside transaction)
-- (Run these separately before main migration)

-- 2. Schema changes with minimal locking
SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- 3. Data validation
DO $$
BEGIN
  -- Validate critical constraints
  IF (SELECT COUNT(*) FROM "Scan" WHERE "normalizedInput" IS NULL AND "status" = 'done') > 0 THEN
    RAISE EXCEPTION 'Data integrity violation: done scans missing normalizedInput';
  END IF;
END $$;

-- 4. Apply changes
ALTER TABLE "Scan" ADD COLUMN "newField" TEXT;

-- 5. Post-migration validation
DO $$
BEGIN
  -- Verify schema state
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'Scan' AND column_name = 'newField') THEN
    RAISE EXCEPTION 'Migration failed: newField not created';
  END IF;
END $$;

COMMIT;
```

### Rollback Procedures

For each migration, create corresponding rollback:

```sql
-- Rollback for optimization migration
BEGIN;

-- Remove new indexes
DROP INDEX CONCURRENTLY IF EXISTS "scan_dedupe_lookup_idx";
DROP INDEX CONCURRENTLY IF EXISTS "evidence_scan_covering_idx";
DROP INDEX CONCURRENTLY IF EXISTS "issue_scan_covering_idx";
DROP INDEX CONCURRENTLY IF EXISTS "cached_list_source_version_idx";

-- Restore original indexes
CREATE INDEX CONCURRENTLY "Scan_normalizedInput_createdAt_idx"
  ON "Scan" ("normalizedInput", "createdAt" DESC);

COMMIT;
```

## Production Migration Strategy

### Phase 1: Index Creation (Zero Downtime)
```bash
# Run during low-traffic periods
psql -d privacy_advisor -c "CREATE INDEX CONCURRENTLY scan_dedupe_lookup_idx ON \"Scan\"(\"normalizedInput\", \"status\", \"finishedAt\" DESC) WHERE \"status\" = 'done' AND \"finishedAt\" IS NOT NULL;"

# Monitor progress
psql -d privacy_advisor -c "SELECT query, state FROM pg_stat_activity WHERE query LIKE '%CREATE INDEX%';"
```

### Phase 2: Schema Updates (Minimal Downtime)
```bash
# During maintenance window
psql -d privacy_advisor -f optimization_migration.sql
```

### Phase 3: Validation & Performance Testing
```bash
# Validate all indexes exist
psql -d privacy_advisor -c "\\di"

# Test critical query performance
psql -d privacy_advisor -c "EXPLAIN ANALYZE SELECT * FROM \"Scan\" WHERE \"normalizedInput\" = 'https://example.com' AND \"status\" = 'done' ORDER BY \"finishedAt\" DESC LIMIT 1;"
```

## Monitoring & Alerting

### Performance Metrics to Track
1. **Query Performance**
   - Average scan lookup time
   - Evidence/Issue aggregation time
   - Cache hit ratios

2. **Database Health**
   - Index usage statistics
   - Table bloat levels
   - Connection pool utilization

3. **Migration Success Indicators**
   - Query plan changes
   - Index scan vs sequential scan ratios
   - Response time improvements

### Alerting Thresholds
- Scan lookup > 100ms
- Report generation > 2 seconds
- Database connection pool > 80% utilization
- Any query taking > 5 seconds