import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PlayerActionDto } from 'shared/dto/playsync.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { PlaysyncService } from './playsync.service';

@UseGuards(JwtAuthGuard)
@Controller('playsync')
export class PlaysyncController {

  constructor(private readonly playsyncService: PlaysyncService) { }

  @Get()
  async findMyTable(@Req() req) {
    const userId = req.user.userId;
    const isDealer = req.user.role === 'DEALER';
    const tableId = req.user.tableId;
    if(isDealer) {
      return await this.playsyncService.findDealerTable(tableId);
    }
    return await this.playsyncService.findMyTables(userId);
  }

  @Get(':id')
  async joinTable(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return await this.playsyncService.joinTable(id, userId);
  }

  @Post(':id')
  async handlePlayerAction(@Req() req, @Param('id') tableId: string, dto: PlayerActionDto) {
    const userId = req.user.userId;
    return await this.playsyncService.handleAction(userId, tableId, dto);

  }

  @Get('dashboard/:tournamentId')
  async getDashboard(@Param('tournamentId') tournamentId: string) {
    return await this.playsyncService.getDashboardInfo(tournamentId);
  }

  @Post('rebuy')
  async processRebuy(
    @Body('tournamentId') tournamentId: string,
    @Body('userId') userId: string,
  ) {
    return await this.playsyncService.processRebuy(tournamentId, userId);
  }

}
