import { Injectable } from '@nestjs/common';
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

  async

  // 세션 참여
  async joinSessionWithSeat(dto: KioskPayMentDto) {
    return await this.prismaService.$transaction(async (tx) => {
      const session = await tx.gameSession.findUnique({
        where: { id: dto.sessionId },
        include: { tournament: true, sitAndGo: true }
      });
      if (!session || session.status === SessionStatus.FINISHED) throw new Error('잘못된 세션 ID 입니다.');

      const isOccupied = await tx.tablePlayer.findUnique({
        where : {
          sessionTableId_seatPosition : {
            sessionTableId : dto.tableId,
            seatPosition : dto.seat
          }
        }
      });

      if (isOccupied) throw new Error('이미 선택된 좌석입니다');

      await this.user.paymentPoint(tx, dto.userId, dto.sessionId, session.name, session.entryFee);

      await tx.sessionParticipation.create({
        data: {
          userId: dto.userId,
          sessionId: dto.sessionId,
          buyInCount: 1,
        }
      });

      await tx.tablePlayer.create({
        data : {
          sessionTableId : dto.tableId,
          userId : dto.userId,
          seatPosition : dto.seat,
          currentStack : session.startStack,
        }
      })

      await tx.gameSession.update({
        where: { id: dto.sessionId },
        data: {
          totalPlayers: { increment: 1 },
          activePlayers: { increment: 1 }
        }
      });
      await this.redisService.releaseSeatLock(dto);
    });
  }

}
