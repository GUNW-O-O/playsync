import { Module } from '@nestjs/common';
import { DealerModule } from './dealer/dealer.module';
import { KioskModule } from './kiosk/kiosk.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SessionModule } from './store/session/session.module';
import { UserModule } from './user/user.module';
import { PlaysyncService } from './playsync/playsync.service';
import { PlaysyncController } from './playsync/playsync.controller';
import { PlaysyncModule } from './playsync/playsync.module';

@Module({
  imports:[
    PrismaModule,
    RedisModule,
    UserModule,
    SessionModule,
    DealerModule,
    KioskModule,
    PlaysyncModule,
  ],
  providers: [PlaysyncService],
  controllers: [PlaysyncController],
})
export class AppModule {}
