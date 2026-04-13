/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Badge` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pointThreshold` to the `Badge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizerId` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `reason` on the `PointHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `lastActivityAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PointReason" AS ENUM ('JOIN_EVENT', 'CHECK_IN', 'COMPLETE_EVENT', 'STREAK_BONUS', 'REFERRAL', 'MANUAL_ADJUSTMENT');

-- AlterTable
ALTER TABLE "Badge" ADD COLUMN     "pointThreshold" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "organizerId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "PointHistory" ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "metadata" JSONB,
DROP COLUMN "reason",
ADD COLUMN     "reason" "PointReason" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "UserBadge" ADD COLUMN     "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");

-- CreateIndex
CREATE INDEX "PointHistory_userId_idx" ON "PointHistory"("userId");

-- CreateIndex
CREATE INDEX "PointHistory_createdAt_idx" ON "PointHistory"("createdAt");

-- CreateIndex
CREATE INDEX "User_totalPoints_idx" ON "User"("totalPoints");

-- CreateIndex
CREATE INDEX "User_lastActivityAt_idx" ON "User"("lastActivityAt");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
