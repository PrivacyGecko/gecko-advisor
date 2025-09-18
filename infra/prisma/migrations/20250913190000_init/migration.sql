-- Prisma initial migration for Privacy Advisor

-- Create table: Scan
CREATE TABLE IF NOT EXISTS "Scan" (
  "id" TEXT PRIMARY KEY,
  "targetType" TEXT NOT NULL,
  "input" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "score" INTEGER,
  "label" TEXT,
  "summary" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "reportSlug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Scan_reportSlug_key" ON "Scan"("reportSlug");

-- Create table: Evidence
CREATE TABLE IF NOT EXISTS "Evidence" (
  "id" TEXT PRIMARY KEY,
  "scanId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "details" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Evidence_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Evidence_scanId_idx" ON "Evidence"("scanId");

-- Create table: CachedList
CREATE TABLE IF NOT EXISTS "CachedList" (
  "id" TEXT PRIMARY KEY,
  "source" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "data" JSONB NOT NULL
);

