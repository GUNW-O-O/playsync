import { Module } from '@nestjs/common';
import { DealerModule } from './dealer/dealer.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SessionModule } from './store/session/session.module';
import { UserModule } from './user/user.module';
import { PlaysyncModule } from './playsync/playsync.module';
import { BullModule } from '@nestjs/bullmq';
import { PaymentModule } from './payment/payment.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { StoreModule } from './store/store.module';

@Module({
  imports:[
    // GraphQLModule.forRoot<ApolloDriverConfig>({
    //   driver: ApolloDriver,
    //   autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    //   // 핵심: context에 req를 담아야 JwtAuthGuard에서 req.user를 꺼낼 수 있습니다.
    //   context: ({ req }) => ({ req }),
    // }),
    BullModule.forRoot({
      connection : {
        host : process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      }
    }),
    AuthModule,
    PlaysyncModule,
    PrismaModule,
    RedisModule,
    UserModule,
    SessionModule,
    DealerModule,
    PlaysyncModule,
    PaymentModule,
    StoreModule
  ],
})
export class AppModule {}
