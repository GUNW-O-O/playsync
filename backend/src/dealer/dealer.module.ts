import { Module } from '@nestjs/common';
import { DealerController } from './dealer.controller';
import { DealerService } from './dealer.service';
import { PlaysyncModule } from 'src/playsync/playsync.module';
import { BullModule } from '@nestjs/bullmq';
import { RedisService } from 'src/redis/redis.service';

@Module({
  imports: [
    BullModule.registerQueue({
          name : 'player-timeout'
        }),
    PlaysyncModule],
  controllers: [DealerController],
  providers: [DealerService, RedisService],
  exports: [DealerService],
})
export class DealerModule {}
