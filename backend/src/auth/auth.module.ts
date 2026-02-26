import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports : [UserModule, PrismaModule],
  controllers : [AuthController],
  providers : [AuthService],
})
export class AuthModule {}
