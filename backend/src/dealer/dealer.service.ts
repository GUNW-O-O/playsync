import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DealerDto } from 'shared/dto/dealer.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DealerService {
  constructor(private prisma: PrismaService) { }

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

}
