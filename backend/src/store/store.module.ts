import { Module } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { StoreService } from './store.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StoreController } from './store.controller';

@Module({
  imports : [UserModule, PrismaModule],
  controllers : [StoreController],
  providers : [StoreService],
})
export class StoreModule {}
