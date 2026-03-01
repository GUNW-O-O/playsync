import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DealerDto } from 'shared/dto/dealer.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DealerService {
  constructor(private prisma: PrismaService) { }

  async loginDealer(dto: DealerDto) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: dto.sessionId }
    })
    if (!session) throw new NotFoundException('세션을 찾을 수 없습니다.')
    if (session.dealerOtp !== dto.otp) {
      throw new UnauthorizedException('딜러 인증 번호가 다릅니다.')
    }

    const existingDealer = await this.prisma.dealerSession.findUnique({
      where: {
        sessionId_physicalTableId: {
          sessionId: dto.sessionId,
          physicalTableId: dto.physicalTableId
        },
      },
    });

    if (existingDealer) {
      return await this.prisma.dealerSession.update({
        where: { id: existingDealer.id },
        data: {
          lastActiveAt: new Date()
        },
      });
    }

    return await this.prisma.dealerSession.create({
      data : {
        sessionId: dto.sessionId,
        physicalTableId: dto.physicalTableId,
      },
    });

  }

}
