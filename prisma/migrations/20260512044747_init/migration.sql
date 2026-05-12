/*
  Warnings:

  - The values [PENDING] on the enum `MentorshipStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `googleEventId` on the `Mentorship` table. All the data in the column will be lost.
  - You are about to drop the column `googleMeetLink` on the `Mentorship` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED');

-- AlterEnum
BEGIN;
CREATE TYPE "MentorshipStatus_new" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."Mentorship" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Mentorship" ALTER COLUMN "status" TYPE "MentorshipStatus_new" USING ("status"::text::"MentorshipStatus_new");
ALTER TYPE "MentorshipStatus" RENAME TO "MentorshipStatus_old";
ALTER TYPE "MentorshipStatus_new" RENAME TO "MentorshipStatus";
DROP TYPE "public"."MentorshipStatus_old";
ALTER TABLE "Mentorship" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "Mentorship" DROP COLUMN "googleEventId",
DROP COLUMN "googleMeetLink",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "mentorshipId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "googleMeetLink" TEXT,
    "googleEventId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_mentorshipId_idx" ON "Session"("mentorshipId");

-- CreateIndex
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- CreateIndex
CREATE INDEX "Session_startTime_idx" ON "Session"("startTime");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "Mentorship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
