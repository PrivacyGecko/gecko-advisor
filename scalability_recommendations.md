# Scalability Assessment for High-Volume Privacy Scanning

## Current Architecture Analysis

### Database Connection Issues
**Problem**: Single PrismaClient instance without connection pooling configuration
```typescript
// Current implementation in apps/backend/src/prisma.ts
export const prisma = new PrismaClient();
```

**Impact**:
- Default connection pool (unlimited)
- No connection timeout handling
- Potential connection exhaustion under load

## Scalability Bottlenecks Identified

### 1. Evidence & Issue Data Growth
**Current State**: No data retention or archival strategy
**Projection**:
- 1000 scans/day = ~365K scans/year
- Average 50 evidence + 10 issues per scan = 21.9M records/year
- Estimated growth: 5GB+ database size annually

### 2. JSON Field Performance Degradation
**Problem**: Heavy use of JSON fields without optimization
- `Scan.meta`: Unindexed JSON queries
- `Evidence.details`: Large JSON objects affecting I/O
- `Issue.references`: JSON array operations

### 3. Cache Strategy Limitations
**Current**: Simple TTL-based caching (15 minutes)
**Issues**:
- No cache warming
- No distributed cache strategy
- No cache invalidation patterns

## High-Volume Optimization Strategy

### Database Connection Optimization

```typescript
// Optimized Prisma configuration
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Connection pool configuration (environment variables)
/*
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20&socket_timeout=60"
PGBOUNCER_URL="postgresql://user:pass@pgbouncer:6543/db?pool_mode=transaction"
*/
```

### Partitioning Strategy for Evidence Data

```sql
-- Partition evidence table by created date for better performance
-- Run this migration for tables > 1M records

BEGIN;

-- 1. Create partitioned table
CREATE TABLE "Evidence_partitioned" (
  id        TEXT NOT NULL,
  scanId    TEXT NOT NULL,
  kind      TEXT NOT NULL,
  severity  INTEGER NOT NULL,
  title     TEXT NOT NULL,
  details   JSONB NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id, createdAt),
  FOREIGN KEY (scanId) REFERENCES "Scan"(id) ON DELETE CASCADE
) PARTITION BY RANGE (createdAt);

-- 2. Create monthly partitions (example for 2025)
CREATE TABLE "Evidence_2025_01" PARTITION OF "Evidence_partitioned"
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE "Evidence_2025_02" PARTITION OF "Evidence_partitioned"
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- Continue for all months...

-- 3. Create indexes on partitions
CREATE INDEX "Evidence_2025_01_scanId_idx" ON "Evidence_2025_01"(scanId);
CREATE INDEX "Evidence_2025_01_kind_idx" ON "Evidence_2025_01"(kind);

-- 4. Migrate data (during maintenance window)
INSERT INTO "Evidence_partitioned" SELECT * FROM "Evidence";

-- 5. Rename tables
ALTER TABLE "Evidence" RENAME TO "Evidence_old";
ALTER TABLE "Evidence_partitioned" RENAME TO "Evidence";

COMMIT;
```

### JSON Field Optimization

```sql
-- Add GIN indexes for JSON field queries
CREATE INDEX CONCURRENTLY "Evidence_details_gin_idx" ON "Evidence" USING gin(details);
CREATE INDEX CONCURRENTLY "Scan_meta_gin_idx" ON "Scan" USING gin(meta);

-- Extract frequently queried JSON fields to columns
ALTER TABLE "Evidence" ADD COLUMN "domain" TEXT GENERATED ALWAYS AS (details->>'domain') STORED;
CREATE INDEX CONCURRENTLY "Evidence_domain_idx" ON "Evidence"(domain) WHERE domain IS NOT NULL;

-- For Issue references
ALTER TABLE "Issue" ADD COLUMN "reference_count" INTEGER GENERATED ALWAYS AS (
  CASE
    WHEN jsonb_typeof(references) = 'array' THEN jsonb_array_length(references)
    ELSE 0
  END
) STORED;
```

### Distributed Caching Strategy

```typescript
// Redis-based distributed caching
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL, {
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

// Cache layers
const CACHE_KEYS = {
  SCAN_RESULT: (normalizedInput: string) => `scan:${normalizedInput}`,
  EVIDENCE_COUNT: (scanId: string) => `evidence:count:${scanId}`,
  PRIVACY_LISTS: (source: string, version: string) => `lists:${source}:${version}`,
} as const;

// Optimized findReusableScan with multi-layer caching
export async function findReusableScanCached(
  prisma: PrismaClient,
  normalizedInput: string,
  cacheTtlMs: number
) {
  // Layer 1: Redis cache (sub-millisecond lookup)
  const cacheKey = CACHE_KEYS.SCAN_RESULT(normalizedInput);
  const cached = await redis.get(cacheKey);

  if (cached) {
    const scan = JSON.parse(cached);
    const age = Date.now() - new Date(scan.finishedAt).getTime();
    if (age < cacheTtlMs) {
      return scan;
    }
    // Expired, remove from cache
    await redis.del(cacheKey);
  }

  // Layer 2: Database lookup with optimized query
  const scan = await findReusableScanOptimized(prisma, normalizedInput, cacheTtlMs);

  if (scan) {
    // Cache for next lookup (TTL = remaining cache time)
    const ttlSeconds = Math.floor((cacheTtlMs - (Date.now() - new Date(scan.finishedAt).getTime())) / 1000);
    if (ttlSeconds > 0) {
      await redis.setex(cacheKey, ttlSeconds, JSON.stringify(scan));
    }
  }

  return scan;
}
```

### Data Retention & Archival Strategy

```sql
-- Monthly cleanup job for old scan data
CREATE OR REPLACE FUNCTION cleanup_old_scans(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date TIMESTAMP;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;

  -- Archive to separate table before deletion (optional)
  INSERT INTO "Scan_archive"
  SELECT * FROM "Scan"
  WHERE "createdAt" < cutoff_date AND "status" IN ('done', 'failed');

  -- Delete old scans (cascades to evidence and issues)
  DELETE FROM "Scan"
  WHERE "createdAt" < cutoff_date AND "status" IN ('done', 'failed');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Update statistics
  ANALYZE "Scan";
  ANALYZE "Evidence";
  ANALYZE "Issue";

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly execution
-- In production, use pg_cron or external scheduler
```

### Read Replica Strategy

```typescript
// Separate read/write database connections
const writeDb = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_WRITE_URL }
  }
});

const readDb = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_READ_URL }
  }
});

// Route queries appropriately
export const prismaRead = readDb;  // For reports, scans lookup
export const prismaWrite = writeDb; // For creating scans, evidence
```

## Performance Monitoring & Scaling Triggers

### Key Metrics to Monitor

1. **Database Performance**
   ```sql
   -- Query to monitor slow queries
   SELECT
     query,
     calls,
     total_time,
     mean_time,
     rows
   FROM pg_stat_statements
   WHERE mean_time > 100  -- queries taking > 100ms
   ORDER BY mean_time DESC;
   ```

2. **Index Usage**
   ```sql
   -- Monitor index efficiency
   SELECT
     schemaname,
     tablename,
     indexname,
     idx_scan,
     idx_tup_read,
     idx_tup_fetch
   FROM pg_stat_user_indexes
   WHERE idx_scan < 100;  -- Potentially unused indexes
   ```

3. **Connection Pool Health**
   ```sql
   SELECT
     state,
     count(*) as connections
   FROM pg_stat_activity
   WHERE datname = 'privacy_advisor'
   GROUP BY state;
   ```

### Scaling Triggers

- **Database Size > 10GB**: Implement partitioning
- **Query response time > 500ms**: Add read replicas
- **Connection count > 80% of limit**: Implement connection pooling (PgBouncer)
- **Scan throughput > 10,000/day**: Consider horizontal scaling

### Horizontal Scaling Considerations

1. **Microservice Split**
   - Separate scan processing from reporting
   - Independent databases for scan queue vs results

2. **Event-Driven Architecture**
   - Use message queues for scan processing
   - Separate evidence collection from aggregation

3. **API Gateway Pattern**
   - Route requests based on load
   - Implement circuit breakers for resilience