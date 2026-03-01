import { Injectable } from '@nestjs/common';
import { SessionStatus, SessionType } from '@prisma/client';
import { CreateSessionDto, UpdateSessionDto } from 'shared/dto/session.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private prismaService: PrismaService) { };

  async getGameSession(sessionId: string) {
    return await this.prismaService.gameSession.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        sessionTables: true,
        tournament: true,
        sitAndGo: true,
      }
    });
  }

  // 해당 매장의 전체 토너먼트 정보
  async getStoreAllSessions(storeId: string) {
    return await this.prismaService.gameSession.findMany({
      where: {
        storeId: storeId,
      },
      include: {
        sessionTables: true,
        tournament: true,
        sitAndGo: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createSession(dto: CreateSessionDto) {
    return await this.prismaService.$transaction(async (tx) => {
      // 1. 기본 게임 세션 생성 (블라인드 구조 연결 및 OTP 생성 포함)
      const session = await tx.gameSession.create({
        data: {
          name: dto.name,
          type: dto.type,
          storeId: dto.storeId,
          blindId: dto.blindId,
          dealerOtp: Math.floor(1000 + Math.random() * 9000), // 4자리 OTP [cite: 9]
          startStack: dto.startStack,
          avgStack: dto.startStack,

          // 2. 타입에 따른 하위 모델 생성 (Tournament / SitAndGo) [cite: 11, 19]
          ...(dto.type === 'TOURNAMENT'
            ? { tournament: { create: { totalBuyinAmount: 0, rebuyUntil: dto.rebuyUntil } } }
            : { sitAndGo: { create: { minPlayers: dto.minPlayers } } }
          ),

          // 3. 선택된 물리 테이블들을 세션 테이블로 즉시 할당 [cite: 16]
          sessionTables: {
            create: dto.tableIds.map((id) => ({
              physicalTableId: id,
            })),
          },
        },
        include: {
          sessionTables: true,
          tournament: true,
          sitAndGo: true,
        }
      });

      return session;
    });
  }

  // 세션 시작
  async startSession(sessionId: string) {
    return await this.prismaService.gameSession.update({
      where: {
        id: sessionId,
      },
      data: {
        status: SessionStatus.ONGOING,
        startedAt: new Date(),
      },
    });
  }

  // 세션 완료
  async completeSession(sessionId: string) {
    return await this.prismaService.gameSession.update({
      where: {
        id: sessionId,
      },
      data: {
        status: SessionStatus.FINISHED,
        finishedAt: new Date(),
      },
    });
  }

  // 세션 수정
  async updateSession(sessionId: string, dto: UpdateSessionDto) {
    const session = await this.getGameSession(sessionId);
    if (session?.status === SessionStatus.ONGOING) {
      throw new Error('진행 중인 세션은 수정할 수 없습니다.');
    }
    if (session?.status === SessionStatus.FINISHED) {
      throw new Error('종료된 세션은 수정할 수 없습니다.');
    }
    const updateData: any = {
      name: dto.name,
      blindId: dto.blindId,
    };
    if (session?.type === SessionType.TOURNAMENT && dto.rebuyUntil !== undefined) {
      updateData.tournament = {
        update: {
          rebuyUntil: dto.rebuyUntil,
        },
      };
    }
    return await this.prismaService.gameSession.update({
      where: {
        id: sessionId,
      },
      data: updateData,
      include: {
        tournament: true,
        sitAndGo: true,
      }
    });
  }


}
