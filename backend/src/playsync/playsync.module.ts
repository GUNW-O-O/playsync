import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PlaysyncService } from './playsync.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection : {host : 'localhost', port: 6379}
    }),
    BullModule.registerQueue({
      name : 'player-timeout'
    }),
  ],
  providers: [PlaysyncService],
  exports: [PlaysyncService],
})
export class PlaysyncModule {}
