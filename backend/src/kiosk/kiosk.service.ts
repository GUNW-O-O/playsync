import { ConflictException, Injectable } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { KioskPayMentDto } from 'shared/dto/kiosk.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { SessionService } from 'src/store/session/session.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class KioskService {
  constructor(private user: UserService,
    private session: SessionService,
    private prismaService: PrismaService,
    private redisService: RedisService,
  ) { };

  async getAvailableSessions(storeId: string) {
    const sessions = await this.session.getStoreAllSessions(storeId);
    return sessions.filter(session => session.status === SessionStatus.ONGOING
      || session.status === SessionStatus.PENDING
    );
  }

  async getAvailableSeats(sessionId: string) {
    return await this.session.getDetailSeatStatus(sessionId);
  }

  // 세션 참여
  async joinSessionWithSeat(dto: KioskPayMentDto) {
    const isLocked = await this.redisService.acquireSeatLock(dto);
    if (!isLocked) {
      throw new ConflictException('이미 다른 유저가 선택 중인 좌석입니다.');
    }
    try {
      return await this.prismaService.$transaction(async (tx) => {
        // DB 최종 중복 체크
        const exsitingPlayer = await tx.tablePlayer.findUnique({
          where: {
            sessionTableId_seatPosition: {
              sessionTableId: dto.tableId,
              seatPosition: dto.seatIndex
            }
          }
        });
        if (exsitingPlayer) throw new Error('이미 플레이어가 존재하는 좌석입니다');

        const session = await tx.gameSession.findUnique({
          where: { id: dto.sessionId },
          include: { tournament: true, sitAndGo: true }
        });
        if (!session || session.status === SessionStatus.FINISHED) throw new ConflictException('잘못된 세션 ID 입니다.');

        await this.user.paymentPoint(tx, dto.userId, dto.sessionId, session.name, session.entryFee);

        await tx.sessionParticipation.create({
          data: {
            userId: dto.userId,
            sessionId: dto.sessionId,
            buyInCount: 1,
          }
        });

        const player = await tx.tablePlayer.create({
          data: {
            sessionTableId: dto.tableId,
            userId: dto.userId,
            seatPosition: dto.seatIndex,
            currentStack: session.startStack,
          }
        })

        await tx.gameSession.update({
          where: { id: dto.sessionId },
          data: {
            totalPlayers: { increment: 1 },
            activePlayers: { increment: 1 }
          }
        });
        return player;
      });
    } finally {
      await this.redisService.releaseSeatLock(dto);
    }
  }

}
