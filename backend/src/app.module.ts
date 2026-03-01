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
import { SessionModule } from './store/session/session.module';
import { KioskService } from './kiosk/kiosk.service';
import { KioskController } from './kiosk/kiosk.controller';
import { KioskModule } from './kiosk/kiosk.module';
import { DealerService } from './dealer/dealer.service';

@Module({
  imports: [UserModule, AuthModule, PrismaModule, StoreModule, RedisModule, SessionModule, KioskModule],
  controllers: [AppController, StoreController, KioskController],
  providers: [AppService, StoreService, GameserviceService, GameEngineService, KioskService, DealerService],
})
export class AppModule {}
