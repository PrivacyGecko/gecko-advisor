-- Phase 1 indices and column backfill
ALTER TABLE "Scan" ADD COLUMN IF NOT EXISTS "normalizedInput" TEXT;

-- Ensure normalized input lookups favor most recent scans
DROP INDEX IF EXISTS "Scan_normalizedInput_idx";
CREATE INDEX IF NOT EXISTS "Scan_normalizedInput_createdAt_idx" ON "Scan" ("normalizedInput", "createdAt" DESC);

-- Safeguard foreign-key access patterns
CREATE INDEX IF NOT EXISTS "Evidence_scanId_idx" ON "Evidence"("scanId");
CREATE INDEX IF NOT EXISTS "Issue_scanId_idx" ON "Issue"("scanId");
