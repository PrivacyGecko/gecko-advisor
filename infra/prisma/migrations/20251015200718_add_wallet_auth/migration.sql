-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('EMAIL', 'WALLET', 'BOTH');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "authMethod" "AuthMethod" NOT NULL DEFAULT 'EMAIL';

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
CREATE UNIQUE INDEX "WalletLink_userId_key" ON "WalletLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLink_walletAddressHash_key" ON "WalletLink"("walletAddressHash");

-- CreateIndex
CREATE INDEX "WalletLink_walletAddressHash_idx" ON "WalletLink"("walletAddressHash");

-- AddForeignKey
ALTER TABLE "WalletLink" ADD CONSTRAINT "WalletLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
