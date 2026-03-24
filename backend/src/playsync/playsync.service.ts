import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlayerStatus, TransactionType } from '@prisma/client';
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
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async joinTable(tableId: string, userId?: string) {
    const tableState = await this.redis.getSnapShot(tableId);
    if (!tableState) throw new Error(`Table ${tableId} not found`);
    if (userId !== null && userId !== undefined) {
      const seatIndex = tableState.players.findIndex(p => p?.id === userId);
      console.log(seatIndex)
      return { tableState, seatIndex };
    } else {
      return { tableState, seatIndex: -1 }
    }
  }

  async findMyTables(userId: string) {
    const players = await this.prisma.tablePlayer.findMany({
      where: { userId: userId },
      include: {
        tournament: {
          select: {
            name: true,
          }
        },
        table: {
          select: {
            tableOrder: true,
          }
        }
      }
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
    try {
      const oldJob = await this.timeoutQueue.getJob(tableId);
      if (oldJob) await oldJob.remove();
    } catch (e) {
      console.log('타임아웃 제거 실패');
    }
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
            removeOnComplete: true,
            removeOnFail: true,
          }
        );
        state.actionDeadline = Date.now() + 30000;
      }
    }

    // Redis 저장
    await this.redis.saveSnapShot(tableId, state);
    if (dto.action === ActionType.TIME_OUT) {
      this.eventEmitter.emit('game.state.updated', { tableId, state: state })
    }
    return state;
  }

  public async syncTableInventoryToDb(state: TableState) {
    const updates = state.players
      .filter(p => p !== null)
      .map(p => this.prisma.tablePlayer.updateMany({
        where: { userId: p.id },
        data: { currentStack: p.stack }
      }));
    const success = await this.prisma.$transaction(updates) ? true : false;
    return success;
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
      const activePlayerCount = await this.redis.eliminatedPlayer(tournamentId, updated.updSession.startStack, updated.updSession.entryFee);
      await this.redis.updateSeatBitmap(tournamentId, user.tableId, user.seatIndex, false);
      if (activePlayerCount === 2) {
        await this.tournamentFinished(tournamentId)
      }
    }
  }

  // 최후 1인
  async tournamentFinished(tournamentId: string) {
    const session = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    const users = await this.prisma.tournamentParticipation.findFirst({
      where: {
        tournamentId: tournamentId,
        status: PlayerStatus.PLAYING
      }
    });
    if (!users) throw new Error('유저 없음.');
    const winner = users[0]
    if (!session) throw new Error('세션 없음.');
    await this.prisma.$transaction(async (tx) => {
      await tx.tournamentParticipation.update({
        where: {
          tournamentId_userId:
            { tournamentId: tournamentId, userId: winner.userId }
        },
        data: {
          finalPlace: 1,
          status: 'AWARDED',
          prizeAmount: session.totalBuyinAmount,
        },
      });
    });
  }

  // public async processRebuy(tournamentId: string, userId: string) {
  //   return 0;
  // }
  public async processRebuy(tournamentId: string, tableId: string, userId: string): Promise<number> {
    return new Promise(async (resolve) => {
      let isResolved = false;
      const timeoutMs = 15000;
      // [웹소켓] 유저에게 리바인 확인 팝업 요청 전송
      this.eventEmitter.emit('rebuy.request.sent', {
        userId,
        tableId,
        deadline: Date.now() + timeoutMs
      });

      // [타이머] 15초 내 응답 없으면 자동 취소 (0 반환)
      const timer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          console.log(`[TIMEOUT] 유저 ${userId} 리바인 시간초과`);
          resolve(0);
        }
      }, 15000);

      // [이벤트] WsGateway에서 전달해주는 유저의 버튼 클릭 응답 대기
      this.eventEmitter.once(`rebuy_res_${userId}`, async (accept: boolean) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timer);

          if (accept) {
            try {
              // 수락 시 기존 트랜잭션 로직 실행
              const resultStack = await this.executeRebuyTransaction(tournamentId, userId);
              resolve(resultStack);
            } catch (error) {
              console.error('리바인 트랜잭션 실패:', error.message);
              resolve(0); // 포인트 부족 등 실패 시 0 반환
            }
          } else {
            resolve(0); // 거절 시 0 반환
          }
        }
      });
    });
  }

  // 리바인 트랜잭션
  public async executeRebuyTransaction(tournamentId: string, userId: string): Promise<number> {
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

      if (user.points < rebuyAmount && tournamentInfo.isRegistrationOpen) {
        return { success: false, session };
      }
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

      return { success: true, session };
    });
    if (userStack.success) {
      await this.redis.rebuyPlayer(tournamentId, userStack.session.entryFee, userStack.session.startStack);
    }
    return userStack.success ? userStack.session.startStack : 0;
  }

  async getDashboardInfo(tournamentId: string) {
    const info = await this.redis.getFullTournamentInfo(tournamentId);
    return info ? info : null;
  }

}
