import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { Queue } from 'bullmq';
import { PlayerActionDto } from 'shared/dto/playsync.dto';
import { TableEngine } from 'src/game-engine/table-engine';
import { ActionType, GamePhase, TableState } from 'src/game-engine/types';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class PlaysyncService {
  constructor(
    @InjectQueue('player-timeout') private timeoutQueue: Queue,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) { }

  async joinTable(tableId: string, userId?: string) {
    const tableState = await this.redis.getSnapShot(tableId);
    if (!tableState) throw new Error(`Table ${tableId} not found`);
    if(userId !== null && userId !== undefined) {
      const seatIndex = tableState.players.findIndex(p => p?.id === userId);
      console.log(seatIndex)
      return {tableState, seatIndex};
    } else {
      return {tableState, seatIndex: -1}
    }
  }

  async findMyTables(userId: string) {
    const players = await this.prisma.tablePlayer.findMany({
      where: { userId: userId }
    });
    if (!players) return null;
    return players;
  }
  async findDealerTable(tableId: string) {
    const table = await this.prisma.table.findMany({
      where: { id: tableId }
    });
    if (!table) return null;
    return table;
  }

  async handleAction(userId: string, tableId: string, dto: PlayerActionDto) {
    // Redis에서 상태 로드 및 엔진 초기화
    const state = await this.redis.getSnapShot(tableId);
    if (!state) throw new Error(`Table ${tableId} not found`);

    const userState = await this.redis.getUserContext(state.tournamentId, userId);

    const engine = new TableEngine(state);

    // 엔진 액션 실행
    const playerIdx = state.players.findIndex(p => p?.id === userId);
    if (userState?.status.endsWith('KICKED')) {
      await engine.act(playerIdx, ActionType.FOLD);
    }
    await engine.act(playerIdx, dto.action, dto.amount);

    // 다음 턴 유저가 결정되었다면 그 유저를 위한 타임아웃 생성
    if (state.phase !== GamePhase.SHOWDOWN && state.currentTurnSeatIndex !== -1) {
      const nextPlayer = state.players[state.currentTurnSeatIndex];
      if (nextPlayer) {
        await this.timeoutQueue.add(
          'player-timeout',
          {
            tableId: tableId,
            userId: nextPlayer.id
          },
          {
            delay: 30000,
            jobId: tableId, // 테이블별 고유 ID로 덮어쓰기/관리
            removeOnComplete: true
          }
        );
        state.actionDeadline = Date.now() + 30000;
      }
    }

    // Redis 저장
    await this.redis.saveSnapShot(tableId, state);
    return state;
  }

  public async syncTableInventoryToDb(state: TableState) {
    const updates = state.players
      .filter(p => p !== null)
      .map(p => this.prisma.tablePlayer.update({
        where: { id: p.id },
        data: { currentStack: p.stack }
      }));
    await this.prisma.$transaction(updates);
  }

  // 탈락
  public async eliminatePlayer(tournamentId: string, userId: string) {
    const user = await this.redis.getUserContext(tournamentId, userId);
    if (!user) throw new Error('유저 없음.');
    const updated = await this.prisma.$transaction(async (tx) => {
      const session = await tx.tournament.findUnique({
        where: { id: tournamentId },
      });
      if (!session) throw new Error('세션 없음');

      const isInTheMoney = session!.activePlayers <= session.itmCount;

      await tx.tournamentParticipation.update({
        where: {
          tournamentId_userId:
            { tournamentId: tournamentId, userId }
        },
        data: {
          finalPlace: session.activePlayers,
          status: (isInTheMoney ? 'AWARDED' : 'ELIMINATED'),
          prizeAmount: session.totalBuyinAmount,
        }
      })
      await tx.tablePlayer.delete({
        where: { tableId_userId: { tableId: user.tableId, userId } },
      });
      const updSession = await tx.tournament.update({
        where: { id: tournamentId },
        data: { activePlayers: { decrement: 1 } }
      });
      return { success: true, updSession };
    });
    // 토너먼트 캐시에서 생존자 -1
    if (updated.success) {
      const activePlayerCount = await this.redis.eliminatedPlayer(tournamentId);
      await this.redis.updateSeatBitmap(tournamentId, user.tableId, user.seatIndex, false);
      if (activePlayerCount === 1) {
        await this.tournamentFinished(tournamentId, userId)
      }
    }
  }

  // 최후 1인
  async tournamentFinished(tournamentId: string, userId: string) {
    const user = await this.redis.getUserContext(tournamentId, userId);
    const session = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!session) throw new Error('세션 없음.');
    if (!user) throw new Error('유저 없음.');
    await this.prisma.$transaction(async (tx) => {
      await tx.tournamentParticipation.update({
        where: {
          tournamentId_userId:
            { tournamentId: tournamentId, userId }
        },
        data: {
          finalPlace: 1,
          status: 'AWARDED',
          prizeAmount: session.totalBuyinAmount,
        },
      });
    });
  }

  // 리바인
  public async processRebuy(tournamentId: string, userId: string): Promise<number> {
    const userStack = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      const tournamentInfo = await this.redis.getTournamentDashboard(tournamentId);
      const session = await tx.tournament.findUnique({
        where: { id: tournamentId },
      });
      const userInfo = await this.redis.getUserContext(tournamentId, userId);
      if (!session || !user || !tournamentInfo || !userInfo) throw new Error('세션 혹은 유저 없음.');

      const rebuyAmount = session.entryFee || 0;
      const rebuyStack = session.startStack;

      if (user.points < rebuyAmount && tournamentInfo.isRegistrationOpen) return -1;
      await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: rebuyAmount } }
      });

      await tx.pointTransaction.create({
        data: {
          userId,
          amount: rebuyAmount * -1,
          type: TransactionType.REBUY,
          tournamentId,
          description: `${session.name} 리바인 -${rebuyAmount}`
        }
      });

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { totalBuyinAmount: { increment: session.entryFee } },
      })

      await tx.tournamentParticipation.update({
        where: { tournamentId_userId: { tournamentId, userId } },
        data: { buyInCount: { increment: 1 } },
      });

      await tx.tablePlayer.update({
        where: { tableId_userId: { tableId: userInfo.tableId, userId } }, // tableId 관리 필요
        data: { currentStack: { increment: rebuyStack } }
      });

      return rebuyStack;
    });
    if (userStack !== 0) {
      await this.redis.rebuyPlayer(tournamentId, userStack);
    }
    return userStack;
  }

  async getDashboardInfo(tournamentId: string) {
    const info = await this.redis.getFullTournamentInfo(tournamentId);
    return info ? info : null;
  }

}
