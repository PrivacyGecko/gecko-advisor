-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subscriptionProvider" TEXT,
ADD COLUMN     "lsCustomerId" TEXT,
ADD COLUMN     "lsSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_lsCustomerId_key" ON "User"("lsCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_lsSubscriptionId_key" ON "User"("lsSubscriptionId");
