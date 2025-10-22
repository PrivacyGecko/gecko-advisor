-- Add progress tracking to scans
ALTER TABLE "Scan" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
