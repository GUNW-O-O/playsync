import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from 'shared/dto/create-user.dto';
import { LoginUserDto } from 'shared/dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from '@prisma/client';
import { UserService } from 'src/user/user.service';


@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) { };

  async createUser(nickname: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { nickname } });
    if (existing) throw new BadRequestException('이미 존재하는 ID입니다.');

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { nickname, password: hashedPassword },
    });
  }


  async createStoreAdmin(nickname: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { nickname } });
    if (existing) throw new BadRequestException('이미 존재하는 ID입니다.');

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { nickname, password: hashedPassword, role: Role.STORE_ADMIN },
    });
  }

  async signup(dto: CreateUserDto) {
  }

  async login(dto: LoginUserDto) {
    const user = await this.userService.findByNickname(dto.nickname);
    if (!user) throw new UnauthorizedException('비밀번호나 닉네임이 틀렸습니다.');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('비밀번호나 닉네임이 틀렸습니다.')

    return { id: user.id, nickname: user.nickname };
  }

}
