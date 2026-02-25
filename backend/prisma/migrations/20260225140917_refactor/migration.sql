/*
  Warnings:

  - The values [STORE_ADMIN] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `blindTime` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `finishedAt` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `startStack` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the `TournamentParticipation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_StoreAdmins` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `blindTime` to the `GameSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startStack` to the `GameSession` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'ONGOING', 'FINISHED');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('USER', 'PLATFORM_ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "TournamentParticipation" DROP CONSTRAINT "TournamentParticipation_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentParticipation" DROP CONSTRAINT "TournamentParticipation_userId_fkey";

-- DropForeignKey
ALTER TABLE "_StoreAdmins" DROP CONSTRAINT "_StoreAdmins_A_fkey";

-- DropForeignKey
ALTER TABLE "_StoreAdmins" DROP CONSTRAINT "_StoreAdmins_B_fkey";

-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "blindTime" INTEGER NOT NULL,
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "startStack" INTEGER NOT NULL,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "status" "SessionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "blindTime",
DROP COLUMN "createdAt",
DROP COLUMN "finishedAt",
DROP COLUMN "startStack",
DROP COLUMN "startedAt",
DROP COLUMN "status",
ADD COLUMN     "registrationEndAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "TournamentParticipation";

-- DropTable
DROP TABLE "_StoreAdmins";

-- DropEnum
DROP TYPE "TournamentStatus";

-- CreateTable
CREATE TABLE "SitAndGo" (
    "id" TEXT NOT NULL,
    "minPlayers" INTEGER NOT NULL,
    "maxPlayers" INTEGER NOT NULL,

    CONSTRAINT "SitAndGo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionParticipation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "buyInCount" INTEGER NOT NULL DEFAULT 1,
    "totalBuyIn" INTEGER NOT NULL,
    "finalRank" INTEGER,
    "prizeAmount" INTEGER,
    "eliminatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionParticipation_userId_sessionId_key" ON "SessionParticipation"("userId", "sessionId");

-- AddForeignKey
ALTER TABLE "SitAndGo" ADD CONSTRAINT "SitAndGo_id_fkey" FOREIGN KEY ("id") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipation" ADD CONSTRAINT "SessionParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipation" ADD CONSTRAINT "SessionParticipation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
