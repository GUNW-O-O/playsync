-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'DEALER', 'STORE_ADMIN', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('TOURNAMENT', 'SIT_AND_GO');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CHARGE', 'BUY_IN', 'REBUY', 'PRIZE', 'REFUND');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'ONGOING', 'SYNCING', 'FINISHED');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('WAITING', 'PLAYING', 'ELIMINATED', 'AWARDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlindStructure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlindStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalTable" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "PhysicalTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SessionType" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "blindId" TEXT,
    "activePlayers" INTEGER NOT NULL DEFAULT 0,
    "totalPlayers" INTEGER NOT NULL DEFAULT 0,
    "avgStack" INTEGER NOT NULL,
    "isRegistrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "dealerOtp" INTEGER NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionParticipation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "buyInCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ParticipationStatus" NOT NULL DEFAULT 'WAITING',
    "finalRank" INTEGER,
    "prizePoints" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "physicalTableId" TEXT NOT NULL,
    "authToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionTable" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "physicalTableId" TEXT NOT NULL,

    CONSTRAINT "SessionTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TablePlayer" (
    "id" TEXT NOT NULL,
    "sessionTableId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seatPosition" INTEGER NOT NULL,
    "currentStack" INTEGER NOT NULL,
    "isEliminated" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TablePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "totalBuyinAmount" INTEGER NOT NULL DEFAULT 0,
    "maxTables" INTEGER NOT NULL,
    "maxPlayers" INTEGER NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitAndGo" (
    "id" TEXT NOT NULL,
    "minPlayers" INTEGER NOT NULL,
    "maxPlayers" INTEGER NOT NULL,

    CONSTRAINT "SitAndGo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "Store_name_key" ON "Store"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BlindStructure_name_key" ON "BlindStructure"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalTable_storeId_number_key" ON "PhysicalTable"("storeId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "SessionParticipation_userId_sessionId_key" ON "SessionParticipation"("userId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerSession_authToken_key" ON "DealerSession"("authToken");

-- CreateIndex
CREATE UNIQUE INDEX "DealerSession_sessionId_physicalTableId_key" ON "DealerSession"("sessionId", "physicalTableId");

-- CreateIndex
CREATE UNIQUE INDEX "TablePlayer_sessionTableId_seatPosition_key" ON "TablePlayer"("sessionTableId", "seatPosition");

-- CreateIndex
CREATE UNIQUE INDEX "TablePlayer_sessionTableId_userId_key" ON "TablePlayer"("sessionTableId", "userId");

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlindStructure" ADD CONSTRAINT "BlindStructure_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalTable" ADD CONSTRAINT "PhysicalTable_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_blindId_fkey" FOREIGN KEY ("blindId") REFERENCES "BlindStructure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipation" ADD CONSTRAINT "SessionParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipation" ADD CONSTRAINT "SessionParticipation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerSession" ADD CONSTRAINT "DealerSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTable" ADD CONSTRAINT "SessionTable_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTable" ADD CONSTRAINT "SessionTable_physicalTableId_fkey" FOREIGN KEY ("physicalTableId") REFERENCES "PhysicalTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TablePlayer" ADD CONSTRAINT "TablePlayer_sessionTableId_fkey" FOREIGN KEY ("sessionTableId") REFERENCES "SessionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TablePlayer" ADD CONSTRAINT "TablePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_id_fkey" FOREIGN KEY ("id") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitAndGo" ADD CONSTRAINT "SitAndGo_id_fkey" FOREIGN KEY ("id") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
