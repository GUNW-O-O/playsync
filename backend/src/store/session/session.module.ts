import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [SessionController],
  providers: [SessionService,], //SessionResolver],
  exports: [SessionService],
})
export class SessionModule {}
