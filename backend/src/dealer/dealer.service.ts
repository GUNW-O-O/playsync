import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DealerDto } from 'shared/dto/dealer.dto';
import { getCurrentBlindLevel } from 'shared/util/util';
import { TableEngine } from 'src/game-engine/table-engine';
import { ActionType, GamePhase } from 'src/game-engine/types';
import { PlaysyncService } from 'src/playsync/playsync.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class DealerService {
  constructor(
    @InjectQueue('player-timeout') private timeoutQueue: Queue,
    private prisma: PrismaService,
    private redis: RedisService,
    private playsync: PlaysyncService,
  ) { }

  async loginDealer(dto: DealerDto) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. 세션 및 OTP 검증 (기존 로직)
      const tournament = await tx.tournament.findUnique({
        where: { id: dto.tournamentId },
        include: {
          dealerSession: true,
        }
      });
      if (!tournament || tournament.dealerOtp !== dto.otp) {
        throw new UnauthorizedException('인증 정보가 올바르지 않습니다.');
      }


      if (tournament.status === 'ONGOING') {
        const table = await tx.table.findUnique({
          where: { tournamentId_id: { tournamentId: dto.tournamentId, id: dto.tableId } },
          include: { tablePlayers: true }
        });

        if (table) {
          // 참가자 상태 변경
          const userIds = table.tablePlayers.map(p => p.userId);
          await tx.tournamentParticipation.updateMany({
            where: {
              userId: { in: userIds },
              tournamentId: dto.tournamentId,
              status: 'WAITING' // 대기 중인 사람만
            },
            data: { status: 'PLAYING' }
          });
        }
      }
      return tournament.dealerSession?.id;
    });
  }

  async startPreFlop(tournamentId: string, tableId: string) {
    const blind = await this.redis.checkAndSyncBlindLevel(tournamentId);
    const state = await this.redis.getSnapShot(tableId);
    if (!state || state.phase !== GamePhase.WAITING) {
      return;
    }
    const ante = blind.blindStructure[blind.currentBlindLv].ante;
    const smallBlind = blind.blindStructure[blind.currentBlindLv].sb;
    const engine = new TableEngine(state);
    engine.startPreFlop(smallBlind, ante);
    await this.redis.saveSnapShot(tableId, state);
    return engine.state;
  }

  async handleDealerAction(tournamentId: string, tableId: string, targetUserId: string, type: 'FOLD' | 'KICK') {
    const state = await this.redis.getSnapShot(tableId);
    const engine = new TableEngine(state);
    const targetIdx = state.players.findIndex(p => p?.id === targetUserId);

    if (targetIdx === -1) throw new Error("대상 플레이어를 찾을 수 없습니다.");

    await this.timeoutQueue.remove(tableId);

    if (type === 'FOLD') {
      await engine.act(targetIdx, ActionType.DEALER_FOLD);
    } else if (type === 'KICK') {
      await engine.act(targetIdx, ActionType.DEALER_KICK);
      const user = await this.redis.getUserContext(targetUserId);
      await this.redis.setUserContext(user.tournamentId, targetUserId, tableId, user.seatIndex, 'KICKED');
      await this.prisma.tournamentParticipation.update({
        where: { tournamentId_userId: { tournamentId: user.tournamentId, userId: targetUserId } },
        data: { status: 'ELIMINATED' }
      });
      await this.prisma.tournament.update({
        where: { id: tournamentId },
        data: { activePlayers: { decrement: 1 } }
      });
    }

    if (state.phase !== GamePhase.SHOWDOWN && state.currentTurnSeatIndex !== -1) {
      const nextPlayer = state.players[state.currentTurnSeatIndex];
      if (nextPlayer) {
        await this.timeoutQueue.add('player-timeout',
          { tournamentId, tableId, userId: nextPlayer.id },
          { delay: 30000, jobId: tableId }
        );
        state.actionDeadline = Date.now() + 30000;
      }
    }

    await this.redis.saveSnapShot(tableId, state); // Redis 저장 및 다음 턴/타이머 세팅
    return state;
  }

  async resolveWinners(tableId: string, winnerUserIds: string[]) {
    const state = await this.redis.getSnapShot(tableId);

    if (winnerUserIds.length === 0) throw new Error("유효한 승자가 없습니다.");
    const engine = new TableEngine(state, async (playerId: string) => {
      const user = await this.redis.getUserContext(playerId);
      return await this.playsync.processRebuy(user.tournamentId, playerId);
    });
    engine.resolveWinner(winnerUserIds);
    for (const player of engine.state.players) {
      if (player && player.stack <= 0) {
        await this.playsync.eliminatePlayer(player.id);
      }
    }
    // DB 동기화: 핸드가 끝났으므로 모든 플레이어의 최종 스택을 PG에 저장
    await this.redis.saveSnapShot(tableId, state);
    await this.playsync.syncTableInventoryToDb(state);

    return state;
  }



}
