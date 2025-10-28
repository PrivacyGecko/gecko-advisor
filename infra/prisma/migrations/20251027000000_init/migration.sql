-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('info', 'low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "Subscription" AS ENUM ('FREE', 'PRO', 'TEAM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');

-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('EMAIL', 'WALLET', 'BOTH');

-- CreateEnum
CREATE TYPE "CheckFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "authMethod" "AuthMethod" NOT NULL DEFAULT 'EMAIL',
    "subscription" "Subscription" NOT NULL DEFAULT 'FREE',
    "subscriptionProvider" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "lsCustomerId" TEXT,
    "lsSubscriptionId" TEXT,
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
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "normalizedInput" TEXT,
    "status" TEXT NOT NULL,
    "score" INTEGER,
    "label" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "slug" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "dedupeOfId" TEXT,
    "shareMessage" TEXT,
    "meta" JSONB,
    "userId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isProScan" BOOLEAN NOT NULL DEFAULT false,
    "scannerIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedList" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

    CONSTRAINT "CachedList_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddressHash" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_lsCustomerId_key" ON "User"("lsCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_lsSubscriptionId_key" ON "User"("lsSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_apiKey_key" ON "User"("apiKey");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_apiKey_idx" ON "User"("apiKey");

-- CreateIndex
CREATE INDEX "User_stripeCustomerId_idx" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Scan_slug_key" ON "Scan"("slug");

-- CreateIndex
CREATE INDEX "Scan_dedupe_lookup_idx" ON "Scan"("normalizedInput", "status", "finishedAt" DESC);

-- CreateIndex
CREATE INDEX "Scan_recent_reports_idx" ON "Scan"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Scan_user_history_idx" ON "Scan"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Scan_public_reports_idx" ON "Scan"("isPublic", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Scan_ip_ratelimit_idx" ON "Scan"("scannerIp", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Evidence_scan_covering_idx" ON "Evidence"("scanId", "createdAt");

-- CreateIndex
CREATE INDEX "Issue_scan_covering_idx" ON "Issue"("scanId", "sortWeight", "createdAt");

-- CreateIndex
CREATE INDEX "Issue_severity_idx" ON "Issue"("severity", "sortWeight");

-- CreateIndex
CREATE INDEX "RateLimit_lookup_idx" ON "RateLimit"("identifier", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_identifier_date_key" ON "RateLimit"("identifier", "date");

-- CreateIndex
CREATE INDEX "WatchedUrl_schedule_idx" ON "WatchedUrl"("lastChecked", "checkFrequency");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedUrl_userId_url_key" ON "WatchedUrl"("userId", "url");

-- CreateIndex
CREATE INDEX "PasswordResetToken_user_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLink_userId_key" ON "WalletLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLink_walletAddressHash_key" ON "WalletLink"("walletAddressHash");

-- CreateIndex
CREATE INDEX "WalletLink_walletAddressHash_idx" ON "WalletLink"("walletAddressHash");

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_dedupeOfId_fkey" FOREIGN KEY ("dedupeOfId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchedUrl" ADD CONSTRAINT "WatchedUrl_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLink" ADD CONSTRAINT "WalletLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

