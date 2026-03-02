import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { RolesGuard } from './guard/roles.guard';

@Module({
  imports : [UserModule],
  controllers : [AuthController],
  providers : [AuthService, RolesGuard],
  exports : [RolesGuard]
})
export class AuthModule {}
