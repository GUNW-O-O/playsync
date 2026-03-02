import { Module } from '@nestjs/common';
import { UserModule } from 'src/user/user.module';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';

@Module({
  imports : [UserModule],
  controllers : [StoreController],
  providers : [StoreService],
})
export class StoreModule {}
