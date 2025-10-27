-- =====================================================
-- ROLLBACK SCRIPT: add_freemium_models
-- =====================================================
-- Migration: 20251006213752_add_freemium_models
-- Created: 2025-10-06
-- Purpose: Rollback Freemium model changes
-- Safety: HIGH - Removes only new tables/columns/enums
--
-- IMPORTANT:
-- - This will delete ALL user accounts, watched URLs, and rate limit data
-- - Scan records will remain but lose userId associations
-- - Anonymous scans (userId = null) are unaffected
-- - Run this ONLY if you need to completely revert the Freemium model
-- =====================================================

-- Start transaction for atomic rollback
BEGIN;

-- =====================================================
-- STEP 1: Drop Foreign Key Constraints
-- =====================================================
DO $$
BEGIN
    -- Drop WatchedUrl foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'WatchedUrl_userId_fkey'
    ) THEN
        ALTER TABLE "WatchedUrl" DROP CONSTRAINT "WatchedUrl_userId_fkey";
        RAISE NOTICE 'Dropped foreign key: WatchedUrl_userId_fkey';
    END IF;

    -- Drop Scan foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Scan_userId_fkey'
    ) THEN
        ALTER TABLE "Scan" DROP CONSTRAINT "Scan_userId_fkey";
        RAISE NOTICE 'Dropped foreign key: Scan_userId_fkey';
    END IF;
END $$;

-- =====================================================
-- STEP 2: Drop New Indexes on Scan Table
-- =====================================================
DO $$
BEGIN
    -- Drop user history index
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'Scan_user_history_idx'
    ) THEN
        DROP INDEX IF EXISTS "Scan_user_history_idx";
        RAISE NOTICE 'Dropped index: Scan_user_history_idx';
    END IF;

    -- Drop public reports index
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'Scan_public_reports_idx'
    ) THEN
        DROP INDEX IF EXISTS "Scan_public_reports_idx";
        RAISE NOTICE 'Dropped index: Scan_public_reports_idx';
    END IF;

    -- Drop IP rate limit index
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'Scan_ip_ratelimit_idx'
    ) THEN
        DROP INDEX IF EXISTS "Scan_ip_ratelimit_idx";
        RAISE NOTICE 'Dropped index: Scan_ip_ratelimit_idx';
    END IF;
END $$;

-- =====================================================
-- STEP 3: Remove New Columns from Scan Table
-- =====================================================
DO $$
BEGIN
    -- Remove userId column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Scan' AND column_name = 'userId'
    ) THEN
        ALTER TABLE "Scan" DROP COLUMN "userId";
        RAISE NOTICE 'Dropped column: Scan.userId';
    END IF;

    -- Remove isPublic column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Scan' AND column_name = 'isPublic'
    ) THEN
        ALTER TABLE "Scan" DROP COLUMN "isPublic";
        RAISE NOTICE 'Dropped column: Scan.isPublic';
    END IF;

    -- Remove isProScan column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Scan' AND column_name = 'isProScan'
    ) THEN
        ALTER TABLE "Scan" DROP COLUMN "isProScan";
        RAISE NOTICE 'Dropped column: Scan.isProScan';
    END IF;

    -- Remove scannerIp column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Scan' AND column_name = 'scannerIp'
    ) THEN
        ALTER TABLE "Scan" DROP COLUMN "scannerIp";
        RAISE NOTICE 'Dropped column: Scan.scannerIp';
    END IF;
END $$;

-- =====================================================
-- STEP 4: Drop New Tables (Cascade to Remove Data)
-- =====================================================
DO $$
DECLARE
    watched_url_count INT;
    rate_limit_count INT;
    user_count INT;
BEGIN
    -- Count records before deletion for reporting
    SELECT COUNT(*) INTO watched_url_count FROM "WatchedUrl";
    SELECT COUNT(*) INTO rate_limit_count FROM "RateLimit";
    SELECT COUNT(*) INTO user_count FROM "User";

    -- Drop WatchedUrl table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'WatchedUrl'
    ) THEN
        DROP TABLE "WatchedUrl" CASCADE;
        RAISE NOTICE 'Dropped table: WatchedUrl (deleted % records)', watched_url_count;
    END IF;

    -- Drop RateLimit table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'RateLimit'
    ) THEN
        DROP TABLE "RateLimit" CASCADE;
        RAISE NOTICE 'Dropped table: RateLimit (deleted % records)', rate_limit_count;
    END IF;

    -- Drop User table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'User'
    ) THEN
        DROP TABLE "User" CASCADE;
        RAISE NOTICE 'Dropped table: User (deleted % records)', user_count;
    END IF;
END $$;

-- =====================================================
-- STEP 5: Drop New Enums
-- =====================================================
DO $$
BEGIN
    -- Drop CheckFrequency enum
    IF EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'CheckFrequency'
    ) THEN
        DROP TYPE "CheckFrequency" CASCADE;
        RAISE NOTICE 'Dropped enum: CheckFrequency';
    END IF;

    -- Drop SubscriptionStatus enum
    IF EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'SubscriptionStatus'
    ) THEN
        DROP TYPE "SubscriptionStatus" CASCADE;
        RAISE NOTICE 'Dropped enum: SubscriptionStatus';
    END IF;

    -- Drop Subscription enum
    IF EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'Subscription'
    ) THEN
        DROP TYPE "Subscription" CASCADE;
        RAISE NOTICE 'Dropped enum: Subscription';
    END IF;
END $$;

-- =====================================================
-- STEP 6: Verify Rollback Success
-- =====================================================
DO $$
DECLARE
    remaining_tables INT;
    remaining_enums INT;
    scan_columns TEXT[];
BEGIN
    -- Check no new tables remain
    SELECT COUNT(*) INTO remaining_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('User', 'RateLimit', 'WatchedUrl');

    -- Check no new enums remain
    SELECT COUNT(*) INTO remaining_enums
    FROM pg_type
    WHERE typname IN ('Subscription', 'SubscriptionStatus', 'CheckFrequency');

    -- Check Scan table columns
    SELECT ARRAY_AGG(column_name) INTO scan_columns
    FROM information_schema.columns
    WHERE table_name = 'Scan'
    AND column_name IN ('userId', 'isPublic', 'isProScan', 'scannerIp');

    -- Report verification results
    IF remaining_tables = 0 AND remaining_enums = 0 AND scan_columns IS NULL THEN
        RAISE NOTICE '✓ Rollback verification PASSED';
        RAISE NOTICE '  - All new tables removed: % remaining', remaining_tables;
        RAISE NOTICE '  - All new enums removed: % remaining', remaining_enums;
        RAISE NOTICE '  - All new Scan columns removed';
    ELSE
        RAISE WARNING '✗ Rollback verification FAILED';
        RAISE WARNING '  - Tables remaining: %', remaining_tables;
        RAISE WARNING '  - Enums remaining: %', remaining_enums;
        RAISE WARNING '  - Scan columns remaining: %', scan_columns;
        -- Don't rollback transaction, let DBA investigate
    END IF;
END $$;

-- =====================================================
-- COMMIT or ROLLBACK
-- =====================================================
-- Review the notices above
-- If everything looks correct, COMMIT
-- If there are warnings, ROLLBACK and investigate

-- Uncomment ONE of the following:
COMMIT;   -- Apply the rollback
-- ROLLBACK; -- Cancel the rollback

-- =====================================================
-- POST-ROLLBACK TASKS
-- =====================================================
-- After successful rollback:
--
-- 1. Update Prisma schema to remove Freemium models
--    - Revert infra/prisma/schema.prisma to previous version
--
-- 2. Regenerate Prisma client
--    npx prisma generate --schema=infra/prisma/schema.prisma
--
-- 3. Update application code
--    - Remove authentication endpoints
--    - Remove rate limiting middleware
--    - Remove Stripe integration
--
-- 4. Restart application services
--    make restart ENV=<your-env>
--
-- 5. Verify application functionality
--    - Test anonymous scanning
--    - Verify existing reports still load
--    - Check that no user-related errors occur
-- =====================================================
