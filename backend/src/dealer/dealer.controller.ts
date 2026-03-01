import { Body, Controller, Post } from '@nestjs/common';
import { DealerService } from './dealer.service';
import { DealerDto } from 'shared/dto/dealer.dto';

@Controller('dealer')
export class DealerController {
  constructor(private readonly dealerService: DealerService) { }

  @Post('login')
  async loginDealer(@Body() dto: DealerDto) {
    const dealerSession = await this.dealerService.loginDealer(dto);

    return {
      accessToken: dealerSession.authToken,
      sessionId: dealerSession.sessionId,
      physicalTableId: dealerSession.physicalTableId,
    };
  }
}
