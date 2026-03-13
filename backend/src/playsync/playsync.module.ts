import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PlaysyncService } from './playsync.service';
import { PlaysyncController } from './playsync.controller';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TimeoutProcessor } from './timeout.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name : 'player-timeout'
    }),
    EventEmitterModule.forRoot(),
  ],
  controllers: [PlaysyncController],
  providers: [
    PlaysyncService,
    TimeoutProcessor
  ],
  exports: [PlaysyncService],
})
export class PlaysyncModule {}
