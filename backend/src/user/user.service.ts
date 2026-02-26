import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {};

  async createUser(nickname: string, password: string) {
    const existing = await this.prisma.user.findUnique({where : {nickname} });
    if (existing) throw new BadRequestException('이미 존재하는 이름입니다.');

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data : {nickname, password : hashedPassword, role: 'USER'},
    });
  }

  async findByNickname(nickname: string) {
    return this.prisma.user.findUnique({ where: {nickname} });
  }
}
