/*
  Warnings:

  - You are about to drop the column `goals` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `interests` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `learningFocus` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "goals",
DROP COLUMN "interests",
DROP COLUMN "learningFocus";
