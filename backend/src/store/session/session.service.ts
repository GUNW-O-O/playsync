import { Injectable } from '@nestjs/common';
import { TournamentStatus } from '@prisma/client';
import { CreateTournamentDto, UpdateTournamentDto } from 'shared/dto/tournament.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private prismaService: PrismaService,
  ) { };

  async getGameSession(id: string) {
    return await this.prismaService.tournament.findUnique({
      where: { id },
      include: {
        tables: true,
        tornamentParticipations: true,
        tablePlayers: true,
        blindStructure: true,
      }
    });
  }

  async getDetailSeatStatus(id: string) {
    const tables = await this.prismaService.table.findMany({
      where: { id },
      include: { tablePlayers: true },
    });
    return tables;
  }

  // 해당 매장의 전체 토너먼트 정보
  async getStoreAllSessions(storeId: string) {
    return await this.prismaService.tournament.findMany({
      where: {
        storeId: storeId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createSession(dto: CreateTournamentDto) {
    return await this.prismaService.$transaction(async (tx) => {
      // 1. 기본 게임 세션 생성 (블라인드 구조 연결 및 OTP 생성 포함)
      const session = await tx.tournament.create({
        data: {
          name: dto.name,
          type: dto.type,
          storeId: dto.storeId,
          blindId: dto.blindId,
          dealerOtp: Math.floor(1000 + Math.random() * 9000), // 4자리 OTP [cite: 9]
          startStack: dto.startStack,
          avgStack: dto.startStack,
          entryFee: dto.entryFee,
          rebuyUntil: dto.rebuyUntil,
          isRegistrationOpen: dto.isRegistrationOpen,
        },
      });

      const dealerSession = await tx.dealerSession.create({
        data: { tournamentId: session.id },
      });

      await tx.table.create({
        data: {
          tableOrder: 1,
          tournamentId: session.id,
          dealerId: dealerSession.id,
        }
      })

      return session;
    });
  }

  // 세션 시작
  async startSession(id: string) {
    return await this.prismaService.tournament.update({
      where: {
        id: id,
      },
      data: {
        status: TournamentStatus.ONGOING,
        startedAt: new Date(),
      },
    });
  }

  // 세션 완료
  async completeSession(id: string) {
    await this.prismaService.$transaction(async (tx) => {
      await tx.tournament.update({
        where: {
          id: id,
        },
        data: {
          status: TournamentStatus.FINISHED,
          finishedAt: new Date(),
        },
      });
      await tx.table.deleteMany({
        where: {
          tournamentId: id,
        },
      });
      await tx.dealerSession.delete({
        where: {
          tournamentId: id,
        },
      });
    })
  }

  // 세션 수정
  async updateSession(id: string, dto: UpdateTournamentDto) {
    const session = await this.getGameSession(id);
    if (session?.status === TournamentStatus.FINISHED) {
      throw new Error('종료된 세션은 수정할 수 없습니다.');
    }
    const updateData: any = {
      name: dto.name,
      blindId: dto.blindId,
      startStack: dto.startStack,
      rebuyUntil: dto.rebuyUntil,
      itmCount: dto.itmCount,
      entryFee: dto.entryFee,
    };
    return await this.prismaService.tournament.update({
      where: {
        id: id,
      },
      data: updateData,
    });
  }


}
