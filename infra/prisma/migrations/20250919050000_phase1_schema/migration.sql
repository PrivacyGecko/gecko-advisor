-- Phase 1 schema updates: scan slug, normalization, issues
ALTER TABLE "Scan" RENAME COLUMN "reportSlug" TO "slug";
ALTER INDEX "Scan_reportSlug_key" RENAME TO "Scan_slug_key";

ALTER TABLE "Scan" ADD COLUMN IF NOT EXISTS "normalizedInput" TEXT;
ALTER TABLE "Scan" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Scan" ADD COLUMN IF NOT EXISTS "dedupeOfId" TEXT;
ALTER TABLE "Scan" ADD COLUMN IF NOT EXISTS "shareMessage" TEXT;
ALTER TABLE "Scan" ADD COLUMN IF NOT EXISTS "meta" JSONB;

CREATE INDEX IF NOT EXISTS "Scan_normalizedInput_idx" ON "Scan"("normalizedInput");
CREATE INDEX IF NOT EXISTS "Scan_status_finishedAt_idx" ON "Scan"("status", "finishedAt");

ALTER TABLE "Scan"
  ADD CONSTRAINT IF NOT EXISTS "Scan_dedupeOfId_fkey"
  FOREIGN KEY ("dedupeOfId")
  REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Evidence" RENAME COLUMN "type" TO "kind";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IssueSeverity') THEN
    CREATE TYPE "IssueSeverity" AS ENUM ('info', 'low', 'medium', 'high', 'critical');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Issue" (
  "id" TEXT PRIMARY KEY,
  "scanId" TEXT NOT NULL,
  "key" TEXT,
  "severity" "IssueSeverity" NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "howToFix" TEXT,
  "whyItMatters" TEXT,
  "references" JSONB,
  "sortWeight" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Issue_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Issue_scanId_idx" ON "Issue"("scanId");
CREATE INDEX IF NOT EXISTS "Issue_severity_sortWeight_idx" ON "Issue"("severity", "sortWeight");
