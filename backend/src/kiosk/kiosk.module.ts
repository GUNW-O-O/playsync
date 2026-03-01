import { Module } from '@nestjs/common';
import { RedisModule } from 'src/redis/redis.module';
import { SessionModule } from 'src/store/session/session.module';
import { UserModule } from 'src/user/user.module';
import { KioskController } from './kiosk.controller';
import { KioskService } from './kiosk.service';

@Module({
  imports: [
    UserModule,
    SessionModule,
    RedisModule,
  ],
  controllers: [KioskController],
  providers: [KioskService],
})
export class KioskModule {}
