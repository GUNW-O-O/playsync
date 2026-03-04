import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { Queue } from 'bullmq';
import { PlayerActionDto } from 'shared/dto/playsync.dto';
import { BlindField, Dashboard } from 'shared/types/tournamentMeta';
import { getCurrentBlindLevel, parseBlindStructure } from 'shared/util/util';
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

  async initializeGame(id: string) {
    // 1. DB에서 세션과 모든 테이블/플레이어 정보를 한 번에 가져옴
    const game = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        tables: {
          include: {
            tablePlayers: true,
          }
        },
        blindStructure: true,
      }
    });

    const startedAt = new Date();
    if (!game) throw new Error("세션 없음");
    const blindStructure = parseBlindStructure(game.blindStructure.structure);
    const blindInfo = getCurrentBlindLevel(blindStructure, startedAt);

    const dashboard: Dashboard = {
      isRegistrationOpen: game.isRegistrationOpen,
      totalPlayer: game.totalPlayers,
      activePlayer: game.activePlayers,
      totalBuyinAmount: game.entryFee * game.totalPlayers,
      rebuyUntil: game.rebuyUntil,
      avgStack: game.avgStack
    }
    const blindField: BlindField = {
      isBreak: false,
      startedAt: startedAt,
      currentBlindLv: blindInfo.currentIndex,
      nextLevelAt: blindInfo.nextLevelAt!,
      serverTime: startedAt,
      blindStructure: blindStructure,
    }

    if (game.totalPlayers < 3) {
      throw new Error('시작하기에 충분한 인원이 아닙니다.')
    }
    await this.prisma.tournament.update({
      where: { id },
      data: { startedAt: startedAt }
    });


    // 2. 각 테이블별로 독립적인 상태 생성 및 Redis 적재
    const tableStates = game.tables.filter(t => t.tablePlayers.length > 0).map(async (t) => {
      const initialState: TableState = {
        phase: GamePhase.WAITING,
        players: Array(9).fill(null),
        pot: 0,
        currentBet: 0,
        buttonUser: 0,
        currentTurnSeatIndex: -1,
        lastRaiserIndex: -1,
        sidePots: [],
        ante: false,
      };

      // 플레이어 배치
      t.tablePlayers.forEach(tp => {
        initialState.players[tp.seatPosition] = {
          id: tp.id,
          tableId: t.id,
          nickName: tp.nickName!,
          seatIndex: tp.seatPosition,
          stack: tp.currentStack,
          bet: 0,
          hasFolded: false,
          isAllIn: false,
          button: false,
          totalContributed: 0,
        };
      });

      // 개별 테이블 단위로 Redis 저장
      await this.redis.setTournamentMeta(id, dashboard, blindField);
      await this.redis.saveSnapShot(t.id, initialState);
      return { tableId: t.id, state: initialState };
    });
    if(tableStates.length > 0) {
      await this.redis.saveInitialTableSnapshots(tableStates as any);
    }
  }


  async handleAction(dto: PlayerActionDto) {
    // Redis에서 상태 로드 및 엔진 초기화
    const state = await this.redis.getSnapShot(dto.tableId);
    if (!state) throw new Error(`Table ${dto.tableId} not found`);

    const userState = await this.redis.getUserContext(dto.tableId);

    const engine = new TableEngine(state);

    // 엔진 액션 실행
    const playerIdx = state.players.findIndex(p => p?.id === dto.userId);
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
            tableId: dto.tableId,
            userId: nextPlayer.id
          },
          {
            delay: 30000,
            jobId: dto.tableId, // 테이블별 고유 ID로 덮어쓰기/관리
            removeOnComplete: true
          }
        );
        state.actionDeadline = Date.now() + 30000;
      }
    }

    // Redis 저장
    await this.redis.saveSnapShot(dto.tableId, state);
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
  public async eliminatePlayer(userId: string) {
    const user = await this.redis.getUserContext(userId);

    await this.prisma.$transaction(async (tx) => {
      const session = await tx.tournament.findUnique({
        where: { id: user.tournamentId },
      });
      if (!session) throw new Error('세션 없음');
      if (session!.activePlayers <= session.itmCount) {
        await tx.tournamentParticipation.update({
          where: {
            tournamentId_userId:
              { tournamentId: user.tournamentId, userId }
          },
          data: { finalPlace: session.activePlayers, status: 'AWARDED' }
        })
      }
      await tx.tablePlayer.delete({
        where: { tableId_userId: { tableId: user.tableId, userId } },
      });
      await tx.tournament.update({
        where: { id: user.tournamentId },
        data: { activePlayers: { decrement: 1 } }
      });
    });
  }

  // 리바인
  public async processRebuy(tournamentId: string, userId: string): Promise<number> {
    return await this.prisma.$transaction(async (tx) => {
      // 유저 포인트 및 세션 리바인 가능 여부 조회
      const user = await tx.user.findUnique({ where: { id: userId } });
      const tournamentInfo = await this.redis.getTournamentDashboard(tournamentId);
      const session = await tx.tournament.findUnique({
        where: { id: tournamentId },
      });
      const userInfo = await this.redis.getUserContext(userId);
      if (!session || !user || !tournamentInfo) throw new Error('세션 혹은 유저 없음.');

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

      await tx.tournamentParticipation.update({
        where: { tournamentId_userId: { tournamentId, userId } },
        data: { buyInCount: { increment: 1 } },
      });

      await tx.tablePlayer.update({
        where: { tableId_userId: { tableId: userInfo.tableId, userId } }, // tableId 관리 필요
        data: { currentStack: { increment: rebuyStack } }
      });

      return rebuyAmount;
    });
  }

}
