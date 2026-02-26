import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { StoreController } from './store/store.controller';
import { StoreService } from './store/store.service';
import { StoreModule } from './store/store.module';

@Module({
  imports: [UserModule, AuthModule, PrismaModule, StoreModule],
  controllers: [AppController, StoreController],
  providers: [AppService, StoreService],
})
export class AppModule {}
