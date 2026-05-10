/*
  Warnings:

  - You are about to drop the column `googleAccessToken` on the `MentorPlan` table. All the data in the column will be lost.
  - You are about to drop the column `googleCalendarConnected` on the `MentorPlan` table. All the data in the column will be lost.
  - You are about to drop the column `googleEmail` on the `MentorPlan` table. All the data in the column will be lost.
  - You are about to drop the column `googleRefreshToken` on the `MentorPlan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MentorPlan" DROP COLUMN "googleAccessToken",
DROP COLUMN "googleCalendarConnected",
DROP COLUMN "googleEmail",
DROP COLUMN "googleRefreshToken";

-- CreateTable
CREATE TABLE "OAuthConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiryDate" TIMESTAMP(3),
    "scopes" TEXT[],
    "connected" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OAuthConnection_provider_idx" ON "OAuthConnection"("provider");

-- CreateIndex
CREATE INDEX "OAuthConnection_connected_idx" ON "OAuthConnection"("connected");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthConnection_userId_provider_key" ON "OAuthConnection"("userId", "provider");

-- AddForeignKey
ALTER TABLE "OAuthConnection" ADD CONSTRAINT "OAuthConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
