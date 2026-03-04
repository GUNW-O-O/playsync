import { Module } from '@nestjs/common';
import { DealerModule } from './dealer/dealer.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SessionModule } from './store/session/session.module';
import { UserModule } from './user/user.module';
import { PlaysyncModule } from './playsync/playsync.module';
import { BullModule } from '@nestjs/bullmq';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports:[
    BullModule.forRoot({
          connection : {host : 'localhost', port: 6379}
        }),
    PlaysyncModule,
    PrismaModule,
    RedisModule,
    UserModule,
    SessionModule,
    DealerModule,
    PlaysyncModule,
    PaymentModule,
  ],
})
export class AppModule {}
