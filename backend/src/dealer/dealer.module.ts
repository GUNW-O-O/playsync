import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';
import { DealerController } from './dealer.controller';
import { DealerService } from './dealer.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [DealerController],
  providers: [DealerService],
  exports: [DealerService],
})
export class DealerModule {}
