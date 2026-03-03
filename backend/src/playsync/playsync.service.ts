import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { Queue } from 'bullmq';
import { PlayerActionDto } from 'shared/dto/playsync.dto';
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

  async initializeGame(sessionId: string) {
    // 1. DB에서 세션과 모든 테이블/플레이어 정보를 한 번에 가져옴
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        sessionTables: {
          include: {
            tablePlayers: { where: { isEliminated: false } }
          }
        },
        blindStructure: true,
      }
    });

    if (!session) throw new Error("세션 없음");
    if (session.totalPlayers < 3) {
      throw new Error('시작하기에 충분한 인원이 아닙니다.')
    }
    const startedAt = new Date();

    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { startedAt: startedAt }
    });

    const blind = parseBlindStructure(session.blindStructure.structure);
    const currentBlind = getCurrentBlindLevel(blind, startedAt);
    await this.redis.setSessionBlinds(sessionId, currentBlind);

    // 2. 각 테이블별로 독립적인 상태 생성 및 Redis 적재
    const tablePromises = session.sessionTables.filter(st => st.tablePlayers.length > 0).map(async (st) => {
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
        blindStructure: blind,
      };

      // 플레이어 배치
      st.tablePlayers.forEach(tp => {
        initialState.players[tp.seatPosition] = {
          id: tp.id,
          userId: tp.userId,
          nickName: tp.nickName,
          seatIndex: tp.seatPosition,
          stack: tp.currentStack,
          bet: 0,
          hasFolded: false,
          isAllIn: false,
          button: false,
          totalContributed: 0,
        };
      });

      // 개별 테이블 단위로 Redis 저장 (성능 핵심)
      await this.redis.saveSnapShot(st.id, initialState);

      // 유저 위치 정보 매핑 (빠른 조회를 위함)
      for (const p of initialState.players.filter(p => p !== null)) {
        await this.redis.setUserContext(sessionId, p.userId, st.id, 'ACTIVE');
      }
    });

    await Promise.all(tablePromises);
  }


  async handleAction(dto: PlayerActionDto) {
    // Redis에서 상태 로드 및 엔진 초기화
    const state = await this.redis.getSnapShot(dto.tableId);
    if (!state) throw new Error(`Table ${dto.tableId} not found`);

    const userState = await this.redis.getUserContext(dto.sessionId, dto.userId);

    const engine = new TableEngine(state);

    // 엔진 액션 실행
    const playerIdx = state.players.findIndex(p => p?.userId === dto.userId);
    if (userState?.endsWith('KICKED')) {
      await engine.act(playerIdx, ActionType.FOLD);
    }
    await engine.act(playerIdx, dto.action, dto.amount);

    // 다음 턴 유저가 결정되었다면 그 유저를 위한 타임아웃 생성
    if (state.phase!== GamePhase.SHOWDOWN && state.currentTurnSeatIndex !== -1) {
      const nextPlayer = state.players[state.currentTurnSeatIndex];
      if (nextPlayer) {
        await this.timeoutQueue.add(
          'player-timeout',
          { 
            sessionId : dto.sessionId,
            tableId: dto.tableId,
            userId: nextPlayer.userId
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
    await this.prisma.$transaction(async (tx) => {
      await tx.tablePlayer.update({
        where: { id: userId },
        data: { isEliminated: true }
      });
      await tx.gameSession.update({
        where: { id: userId },
        data: { activePlayers: { decrement: 1 } }
      });
    });
  }

  // 리바인
  public async processRebuy(tableId: string, userId: string, sessionId: string): Promise<boolean> {
    return await this.prisma.$transaction(async (tx) => {
      // 유저 포인트 및 세션 리바인 가능 여부 조회
      const user = await tx.user.findUnique({ where: { id: userId } });
      const session = await tx.gameSession.findUnique({
        where: { id: sessionId },
        include: { tournament: true }
      });

      if (!session || !user || !session.tournament) throw new Error('세션 혹은 유저 없음.');

      const blindLv = (await this.redis.getSessionBlinds(sessionId)).currentIndex;
      const rebuyAmount = session.entryFee || 0;
      const rebuyStack = session.startStack;

      if (user.points < rebuyAmount && session.tournament.rebuyUntil < blindLv) return false;

      await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: rebuyAmount } }
      });

      await tx.pointTransaction.create({
        data: {
          userId,
          amount: rebuyAmount * -1,
          type: TransactionType.REBUY,
          sessionId
        }
      });

      await tx.sessionParticipation.update({
        where: { userId_sessionId: { sessionId, userId } },
        data: { buyInCount: { increment: 1 } },
      });

      await tx.tablePlayer.update({
        where: { sessionTableId_userId: { sessionTableId: tableId, userId } }, // tableId 관리 필요
        data: { currentStack: { increment: rebuyStack } }
      });

      return true;
    });
  }

}
