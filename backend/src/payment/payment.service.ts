import { ConflictException, Injectable } from '@nestjs/common';
import { TournamentStatus } from '@prisma/client';
import { PayMentDto } from 'shared/dto/payment.dto';
import { GamePhase, TablePlayer } from 'src/game-engine/types';
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

  // 상점별 기능 개발시
  // async getAvailableSessions(storeId: string) {
  //   const sessions = await this.session.getStoreAllSessions(storeId);
  //   return sessions.filter(session => session.status === TournamentStatus.ONGOING
  //     || session.status === TournamentStatus.PENDING
  //   );
  // }

  async getAvailableSessions() {
    return await this.session.getAllSessions();
  }

  async getTournamentInfo(tournamentId: string) {
    const tournament = await this.session.getGameSession(tournamentId);
    const seatStatus = await this.redisService.getTournamentTables(tournamentId);
    return { tournament, seatStatus };
  }

  // 세션 참여
  async joinSessionWithSeat(dto: PayMentDto, userId: string) {
    const isLocked = await this.redisService.acquireSeatLock(dto, userId);
    if (!isLocked) {
      throw new ConflictException('이미 다른 유저가 선택 중인 좌석입니다.');
    }
    try {
      const user = await this.user.findByUUID(userId);
      if (!user) {
        throw new ConflictException('잘못된 유저 ID 입니다.')
      }
      const session = await this.prismaService.tournament.findUnique({
        where: { id: dto.tournamentId },
      });
      if (!session) throw new ConflictException('잘못된 세션 ID 입니다.');
      if (session.status === TournamentStatus.FINISHED || !session.isRegistrationOpen) {
        throw new ConflictException('이미 종료된 세션입니다.');
      }
      const result = await this.prismaService.$transaction(async (tx) => {
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
        await this.user.paymentPoint(tx, userId, dto.tournamentId, session.name, session.entryFee);
        await tx.tournamentParticipation.create({
          data: {
            userId: userId,
            tournamentId: dto.tournamentId,
          }
        });
        await tx.tablePlayer.create({
          data: {
            tournamentId: session.id,
            nickname: user.nickname,
            tableId: dto.tableId,
            userId: userId,
            seatPosition: dto.seatIndex,
            currentStack: session.startStack,
          }
        })
        await tx.tournament.update({
          where: { id: dto.tournamentId },
          data: {
            totalPlayers: { increment: 1 },
            activePlayers: { increment: 1 },
            totalBuyinAmount: { increment: session.entryFee },
          }
        });
        let updatedState = await this.redisService.getSnapShot(dto.tableId);
        const isOngoing = session.status === TournamentStatus.ONGOING;

        const newPlayer: TablePlayer = {
          id: userId,
          tableId: dto.tableId,
          nickname: user.nickname!,
          seatIndex: dto.seatIndex,
          stack: session.startStack,
          bet: 0,
          hasFolded: isOngoing, // 게임 중이면 true, 대기 중이면 false
          isAllIn: false,
          button: false,
          totalContributed: 0,
        };

        if (!updatedState) {
          updatedState = {
            phase: GamePhase.WAITING,
            players: Array(9).fill(null),
            pot: 0,
            currentBet: 0,
            buttonUser: 0,
            currentTurnSeatIndex: -1,
            lastRaiserIndex: -1,
            sidePots: [],
            ante: false,
            tournamentId: session.id,
          };
        }
        updatedState.players[dto.seatIndex] = newPlayer;
        await this.redisService.saveSnapShot(dto.tableId, updatedState);
        return { success: true, updatedState };
      });
      if (result.success) {
        await this.redisService.setUserContext(dto.tournamentId, userId, dto.tableId, dto.seatIndex, 'ACTIVE');
        await this.redisService.joinPlayer(dto.tournamentId, session.entryFee);
        const table = await this.redisService.updateSeatBitmap(dto.tournamentId, dto.tableId, dto.seatIndex, true);
        let cnt = 0;
        table.split('').forEach(idx => {
          if (idx === '1') cnt++;
        })
        if (cnt === 7) {
          await this.session.createTable(dto.tournamentId);
        }
      }
      return result.updatedState;
    } finally {
      await this.redisService.releaseSeatLock(dto);
    }
  }
}
