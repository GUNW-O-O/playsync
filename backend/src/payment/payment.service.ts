import { ConflictException, Injectable } from '@nestjs/common';
import { TournamentStatus } from '@prisma/client';
import { PayMentDto } from 'shared/dto/payment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { SessionService } from 'src/store/session/session.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class PaymentService {
  constructor(private user: UserService,
    private session: SessionService,
    private prismaService: PrismaService,
    private redisService: RedisService,

  ) { };

  async getAvailableSessions(storeId: string) {
    const sessions = await this.session.getStoreAllSessions(storeId);
    return sessions.filter(session => session.status === TournamentStatus.ONGOING
      || session.status === TournamentStatus.PENDING
    );
  }

  async getAvailableSeats(sessionId: string) {
    return await this.session.getDetailSeatStatus(sessionId);
  }

  // 세션 참여
  async joinSessionWithSeat(dto: PayMentDto) {
    const isLocked = await this.redisService.acquireSeatLock(dto);
    if (!isLocked) {
      throw new ConflictException('이미 다른 유저가 선택 중인 좌석입니다.');
    }
    try {
      const user = await this.user.findByUUID(dto.userId);
      if (!user) {
        throw new ConflictException('잘못된 유저 ID 입니다.')
      }
      return await this.prismaService.$transaction(async (tx) => {
        // DB 최종 중복 체크
        const exsitingPlayer = await tx.tablePlayer.findUnique({
          where: {
            tableId_seatPosition: {
              tableId: dto.tableId,
              seatPosition: dto.seatIndex
            }
          }
        });
        if (exsitingPlayer) throw new Error('이미 플레이어가 존재하는 좌석입니다');

        const session = await tx.tournament.findUnique({
          where: { id: dto.tableId },
        });
        if (!session) throw new ConflictException('잘못된 세션 ID 입니다.');
        if (session.status === TournamentStatus.FINISHED || !session.isRegistrationOpen) {
          throw new ConflictException('이미 종료된 세션입니다.');
        }

        await this.user.paymentPoint(tx, dto.userId, dto.tableId, session.name, session.entryFee);

        await tx.tournamentParticipation.create({
          data: {
            userId: dto.userId,
            tournamentId: session.id,
          }
        });

        const player = await tx.tablePlayer.create({
          data: {
            tournamentId: session.id,
            nickName: user.nickname,
            tableId: dto.tableId,
            userId: dto.userId,
            seatPosition: dto.seatIndex,
            currentStack: session.startStack,
          }
        })

        await tx.tournament.update({
          where: { id: dto.tableId },
          data: {
            totalPlayers: { increment: 1 },
            activePlayers: { increment: 1 }
          }
        });
        await this.redisService.setUserContext(session.id, dto.userId, dto.tableId, dto.seatIndex, 'ACTIVE');
        return player;
      });
    } finally {
      await this.redisService.releaseSeatLock(dto);
    }
  }
}
