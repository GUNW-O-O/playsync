import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {};

  async createUser(nickname: string, password: string) {
    const existing = await this.prisma.user.findUnique({where : {nickname} });
    if (existing) throw new BadRequestException('이미 존재하는 ID입니다.');

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data : {nickname, password : hashedPassword},
    });
  }
  
  async findByNickname(nickname: string) {
    return this.prisma.user.findUnique({ where: {nickname} });
  }

  async findByUUID( id : string ) {
    const user = this.prisma.user.findUnique({ where : {id}});
    if(!user) {
      throw new NotFoundException('UUID 조회 실패');
    }
    return user;
  }
  
  async createStoreAdmin(nickname : string, password: string) {
    const existing = await this.prisma.user.findUnique({where : {nickname} });
    if (existing) throw new BadRequestException('이미 존재하는 ID입니다.');
  
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data : {nickname, password : hashedPassword, role : Role.STORE_ADMIN},
    });
  }

  async paymentPoint (tx: any,userId: string, sessionId: string, sessionName: string, amount: number) {
    const user = await this.findByUUID(userId);
    if(!user) throw new NotFoundException('유저를 찾을 수 없습니다');

    await tx.user.update({
      where : {id : userId},
      data : {point : {decrement : amount}}
    });
    await tx.pointTransaction.create({
      data : {
        userId,
        amount : -amount,
        type: 'BUY_IN',
        sessionId,
        description: `${sessionName} 바이인`
      }
    })
  }

}
