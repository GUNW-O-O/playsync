import { BadRequestException, Injectable } from '@nestjs/common';
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
  
  async createStoreAdmin(nickname : string, password: string) {
    const existing = await this.prisma.user.findUnique({where : {nickname} });
    if (existing) throw new BadRequestException('이미 존재하는 ID입니다.');
  
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data : {nickname, password : hashedPassword, role : Role.STORE_ADMIN},
    });
  }
}
