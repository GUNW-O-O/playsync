import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DealerDto } from 'shared/dto/dealer.dto';
import { getCurrentBlindLevel } from 'shared/util/util';
import { TableEngine } from 'src/game-engine/table-engine';
import { ActionType } from 'src/game-engine/types';
import { PlaysyncService } from 'src/playsync/playsync.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class DealerService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private playsync: PlaysyncService,
  ) { }

  // src/store/session/dealer.service.ts

  async loginDealer(dto: DealerDto) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. 세션 및 OTP 검증 (기존 로직)
      const session = await tx.gameSession.findUnique({ where: { id: dto.sessionId } });
      if (!session || session.dealerOtp !== dto.otp) {
        throw new UnauthorizedException('인증 정보가 올바르지 않습니다.');
      }

      // 2. 딜러 세션 생성/업데이트
      const dealer = await tx.dealerSession.upsert({
        where: {
          sessionId_physicalTableId: {
            sessionId: dto.sessionId,
            physicalTableId: dto.physicalTableId,
          },
        },
        update: { lastActiveAt: new Date() },
        create: {
          sessionId: dto.sessionId,
          physicalTableId: dto.physicalTableId,
        },
      });

      // 3. [핵심] 세션이 ONGOING 상태라면 해당 테이블 플레이어들을 PLAYING으로 전환
      if (session.status === 'ONGOING') {
        // 이 테이블(SessionTable)의 ID를 먼저 찾음
        const sessionTable = await tx.sessionTable.findFirst({
          where: { sessionId: dto.sessionId, physicalTableId: dto.physicalTableId }
        });

        if (sessionTable) {
          // 해당 테이블에 속한 모든 참여자(Participation) 상태 변경
          // TablePlayer에 연결된 User ID들을 가져와서 Participation 테이블 업데이트
          const tablePlayers = await tx.tablePlayer.findMany({
            where: { sessionTableId: sessionTable.id }
          });

          const userIds = tablePlayers.map(p => p.userId);

          await tx.sessionParticipation.updateMany({
            where: {
              sessionId: dto.sessionId,
              userId: { in: userIds },
              status: 'WAITING' // 대기 중인 사람만
            },
            data: { status: 'PLAYING' }
          });
        }
      }

      return dealer;
    });
  }

  async startPreFlop(sessionId: string, tableId: string) {
    const blind = await this.redis.getSessionBlinds(sessionId);
    const state = await this.redis.getSnapShot(tableId);
    const ante = state.ante;

    const isLevelUp =
      blind.nextLevelAt && blind.nextLevelAt < new Date();

    const currentBlind = isLevelUp
      ? getCurrentBlindLevel(state.blindStructure, blind.startedAt)
      : blind;

    const smallBlind = state.blindStructure[currentBlind.currentIndex].sb;
    await this.redis.setSessionBlinds(sessionId, currentBlind);
    const engine = new TableEngine(state);
    engine.startPreFlop(smallBlind, ante);
  }

  async handleDealerAction(sessionId: string, tableId: string, targetUserId: string, type: 'FOLD' | 'KICK') {
    const state = await this.redis.getSnapShot(tableId);
    const engine = new TableEngine(state);
    const targetIdx = state.players.findIndex(p => p?.userId === targetUserId);

    if (targetIdx === -1) throw new Error("대상 플레이어를 찾을 수 없습니다.");

    if (type === 'FOLD') {
      await engine.act(targetIdx, ActionType.DEALER_FOLD);
    } else if (type === 'KICK') {
      await engine.act(targetIdx, ActionType.DEALER_KICK);
      await this.redis.setUserContext(sessionId, targetUserId, tableId, 'KICKED');
      await this.prisma.tablePlayer.update({
        where: { sessionTableId_userId: { sessionTableId: tableId, userId: targetUserId } },
        data: { isEliminated: true }
      });
      await this.prisma.gameSession.update({
        where: { id: sessionId },
        data: { activePlayers: { decrement: 1 } }
      });
    }

    await this.redis.saveSnapShot(tableId, state); // Redis 저장 및 다음 턴/타이머 세팅
  }

  async resolveWinners(tableId: string, winnerUserIds: string[]) {
    const state = await this.redis.getSnapShot(tableId);

    if (winnerUserIds.length === 0) throw new Error("유효한 승자가 없습니다.");
    const engine = new TableEngine(state);
    engine.resolveWinner(winnerUserIds);

    for (const player of state.players) {
      if (player && player.stack <= 0) {
        // TODO : 리바이 결과값으로 탈락처리

        await this.playsync.eliminatePlayer(player.userId);
      }
      // 상금등수가 아닐때
      // 상금진입

    }

    // DB 동기화: 핸드가 끝났으므로 모든 플레이어의 최종 스택을 PG에 저장

    await this.redis.saveSnapShot(tableId, state);
    await this.playsync.syncTableInventoryToDb(state);
  }



}
