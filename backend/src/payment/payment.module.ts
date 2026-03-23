import { Module } from '@nestjs/common';
import { SessionModule } from 'src/store/session/session.module';
import { UserModule } from 'src/user/user.module';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    UserModule,
    SessionModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [PaymentService],
  exports : [PaymentService],
  controllers: [PaymentController]
})
export class PaymentModule { }
