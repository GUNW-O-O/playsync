import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PlaysyncService } from './playsync.service';
import { PlaysyncController } from './playsync.controller';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    BullModule.registerQueue({
      name : 'player-timeout'
    }),
    EventEmitterModule.forRoot(),
  ],
  controllers: [PlaysyncController],
  providers: [PlaysyncService],
  exports: [PlaysyncService],
})
export class PlaysyncModule {}
