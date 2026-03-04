import { Module } from '@nestjs/common';
import { SessionModule } from 'src/store/session/session.module';
import { UserModule } from 'src/user/user.module';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    UserModule,
    SessionModule,
  ],
  providers: [PaymentService],
  exports : [PaymentService]
})
export class PaymentModule { }
