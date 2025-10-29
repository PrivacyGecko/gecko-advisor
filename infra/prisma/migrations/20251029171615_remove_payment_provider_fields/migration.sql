-- AlterTable: Remove payment provider fields from User table
-- This migration removes all Stripe and LemonSqueezy integration fields
-- as part of converting to a 100% free, open-source privacy scanning tool

-- Drop indexes first
DROP INDEX IF EXISTS "User_lsCustomerId_key";
DROP INDEX IF EXISTS "User_lsSubscriptionId_key";
DROP INDEX IF EXISTS "User_stripeCustomerId_idx";
DROP INDEX IF EXISTS "User_stripeCustomerId_key";
DROP INDEX IF EXISTS "User_stripeSubscriptionId_key";

-- Drop payment provider columns
ALTER TABLE "User" DROP COLUMN IF EXISTS "lsCustomerId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "lsSubscriptionId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "stripeCustomerId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "stripeSubscriptionId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "subscriptionProvider";
