import { Body, Controller, Get, Post } from '@nestjs/common';
import { DealerService } from './dealer.service';
import { DealerDto } from 'shared/dto/dealer.dto';
import { SessionService } from 'src/store/session/session.service';

@Controller('dealer')
export class DealerController {
  constructor(private readonly dealerService: DealerService,
    private readonly sessionService: SessionService,
  ) { }

  @Get()
  async getAvailableSessions() {
    return await this.sessionService.getGameSessionWithTables();
  }


  @Post('auth')
  async loginDealer(@Body() dto: DealerDto) {
    const dealerSession = await this.dealerService.loginDealer(dto);

    if (!dealerSession) throw new Error('세션 없음')

    return dealerSession;
  }
}
