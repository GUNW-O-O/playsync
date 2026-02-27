import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { StoreController } from './store/store.controller';
import { StoreService } from './store/store.service';
import { StoreModule } from './store/store.module';
import { RedisModule } from './redis/redis.module';
import { GameserviceService } from './gameservice/gameservice.service';
import { GameEngineService } from './game-engine/game-engine.service';

@Module({
  imports: [UserModule, AuthModule, PrismaModule, StoreModule, RedisModule],
  controllers: [AppController, StoreController],
  providers: [AppService, StoreService, GameserviceService, GameEngineService],
})
export class AppModule {}
