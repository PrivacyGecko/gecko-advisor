-- CreateEnum
CREATE TYPE "Subscription" AS ENUM ('FREE', 'PRO', 'TEAM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');

-- CreateEnum
CREATE TYPE "CheckFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "subscription" "Subscription" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "subscriptionEndsAt" TIMESTAMP(3),
    "apiKey" TEXT,
    "apiCallsMonth" INTEGER NOT NULL DEFAULT 0,
    "apiResetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "scansCount" INTEGER NOT NULL DEFAULT 0,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchedUrl" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "lastScore" INTEGER,
    "lastChecked" TIMESTAMP(3),
    "checkFrequency" "CheckFrequency" NOT NULL DEFAULT 'WEEKLY',
    "alertOnChange" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchedUrl_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "userId" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isProScan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scannerIp" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_apiKey_key" ON "User"("apiKey");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_apiKey_idx" ON "User"("apiKey");

-- CreateIndex
CREATE INDEX "User_stripeCustomerId_idx" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_identifier_date_key" ON "RateLimit"("identifier", "date");

-- CreateIndex
CREATE INDEX "RateLimit_lookup_idx" ON "RateLimit"("identifier", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedUrl_userId_url_key" ON "WatchedUrl"("userId", "url");

-- CreateIndex
CREATE INDEX "WatchedUrl_schedule_idx" ON "WatchedUrl"("lastChecked", "checkFrequency");

-- CreateIndex (New indexes for Scan table)
CREATE INDEX "Scan_user_history_idx" ON "Scan"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Scan_public_reports_idx" ON "Scan"("isPublic", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Scan_ip_ratelimit_idx" ON "Scan"("scannerIp", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchedUrl" ADD CONSTRAINT "WatchedUrl_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
