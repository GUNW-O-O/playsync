/*
  Warnings:

  - You are about to drop the column `prizeAmount` on the `SessionParticipation` table. All the data in the column will be lost.
  - You are about to drop the column `totalBuyIn` on the `SessionParticipation` table. All the data in the column will be lost.
  - You are about to drop the column `registrationEndAt` on the `Tournament` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[dealerToken]` on the table `SessionTable` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sessionTableId,userId]` on the table `TablePlayer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `breakTimeInterval` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itmCount` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxTables` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CHARGE', 'BUY_IN', 'REBUY', 'PRIZE', 'REFUND');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('WAITING', 'PLAYING', 'ELIMINATED', 'AWARDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SessionStatus" ADD VALUE 'BREAK';
ALTER TYPE "SessionStatus" ADD VALUE 'SYNCING';

-- DropForeignKey
ALTER TABLE "GameSession" DROP CONSTRAINT "GameSession_storeId_fkey";

-- DropForeignKey
ALTER TABLE "PhysicalTable" DROP CONSTRAINT "PhysicalTable_storeId_fkey";

-- DropForeignKey
ALTER TABLE "SessionParticipation" DROP CONSTRAINT "SessionParticipation_sessionId_fkey";

-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "blindStructure" JSONB,
ADD COLUMN     "currentLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "dealerOtp" TEXT,
ADD COLUMN     "lastBlindUpAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SessionParticipation" DROP COLUMN "prizeAmount",
DROP COLUMN "totalBuyIn",
ADD COLUMN     "buyInPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "prizePoints" INTEGER DEFAULT 0,
ADD COLUMN     "status" "ParticipationStatus" NOT NULL DEFAULT 'WAITING';

-- AlterTable
ALTER TABLE "SessionTable" ADD COLUMN     "dealerToken" TEXT,
ADD COLUMN     "isHandOngoing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsSync" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SitAndGo" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "registrationEndAt",
ADD COLUMN     "breakTimeInterval" INTEGER NOT NULL,
ADD COLUMN     "itmCount" INTEGER NOT NULL,
ADD COLUMN     "maxTables" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "sessionId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionTable_dealerToken_key" ON "SessionTable"("dealerToken");

-- CreateIndex
CREATE UNIQUE INDEX "TablePlayer_sessionTableId_userId_key" ON "TablePlayer"("sessionTableId", "userId");

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalTable" ADD CONSTRAINT "PhysicalTable_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipation" ADD CONSTRAINT "SessionParticipation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
