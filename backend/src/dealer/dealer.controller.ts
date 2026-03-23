import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DealerService } from './dealer.service';
import { DealerDto } from 'shared/dto/dealer.dto';
import { SessionService } from 'src/store/session/session.service';

@Controller('dealer')
export class DealerController {
  constructor(private readonly dealerService: DealerService,
    private readonly sessionService: SessionService,
  ) { }

  @Get('/:id')
  async getTournamentWithTables(@Param('id') tournamentId: string) {
    return await this.sessionService.getGameSessionWithTables(tournamentId);
  }


  @Post('auth')
  async loginDealer(@Body() dto: DealerDto) {
    const dealerSession = await this.dealerService.loginDealer(dto);

    if (!dealerSession) throw new Error('세션 없음')

    return dealerSession;
  }
}
