/*
  Warnings:

  - A unique constraint covering the columns `[streamChannelId]` on the table `Mentorship` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Mentorship" ADD COLUMN     "streamChannelId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Mentorship_streamChannelId_key" ON "Mentorship"("streamChannelId");
