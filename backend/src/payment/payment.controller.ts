import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PayMentDto } from 'shared/dto/payment.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

@Controller('tournaments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  async getAvailableSessions() {
    return await this.paymentService.getAvailableSessions();
  }
  
  @Get(':id')
  async getTournamentInfo(@Param('id') id: string) {
    return await this.paymentService.getTournamentInfo(id);
  }
  
  @UseGuards(JwtAuthGuard)
  @Post('payment')
  async joinSession(@Body() dto: PayMentDto, @Req() req: any) {
    const userId = req.user.userId;
    return await this.paymentService.joinSessionWithSeat(dto, userId);
  }

}
