import { Module, Global, DynamicModule } from '@nestjs/common';
import Redis from 'ioredis';

@Global()
@Module({})
export class RedisModule {
  static register(): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: 'REDIS_CLIENT',
          useFactory: () => {
            return new Redis({
              host: 'localhost',
              port: 6379,
            });
          },
        },
      ],
      exports: ['REDIS_CLIENT'],
    };
  }
}