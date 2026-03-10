import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PlaysyncService } from './playsync.service';
import { PlaysyncController } from './playsync.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name : 'player-timeout'
    }),
  ],
  controllers: [PlaysyncController],
  providers: [PlaysyncService],
  exports: [PlaysyncService],
})
export class PlaysyncModule {}
