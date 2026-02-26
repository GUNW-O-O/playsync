import { Module } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { StoreService } from './store.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports : [UserModule, PrismaModule],
  providers : [StoreService]
})
export class StoreModule {}
