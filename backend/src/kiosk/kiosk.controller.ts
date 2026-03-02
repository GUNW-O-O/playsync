import { Body, ConflictException, Controller, Get, Param, Post } from '@nestjs/common';
import { KioskPayMentDto } from 'shared/dto/kiosk.dto';
import { RedisService } from 'src/redis/redis.service';
import { KioskService } from './kiosk.service';

@Controller('kiosk')
export class KioskController {
  constructor(private readonly kiosk: KioskService) { }

  // 1. 매장 내 참여 가능 세션 목록 (비로그인)
  @Get('store/:storeId/sessions')
  async getSessions(@Param('storeId') storeId: string) {
    return this.kiosk.getAvailableSessions(storeId);
  }

  // 2. 특정 세션의 테이블 및 좌석 현황 (비로그인)
  @Get('session/:sessionId/seats')
  async getSeatStatus(@Param('sessionId') sessionId: string) {
    return this.kiosk.getAvailableSeats(sessionId);
  }

  // 3. 결제 및 좌석 확정 (로그인 필수)
  @Post('entry')
  async reserve(@Body() dto: KioskPayMentDto) {
    return this.kiosk.joinSessionWithSeat(dto);
  }

  @Post('rebuy')
  async rebuy(@Body() dto: KioskPayMentDto) {
    return this.kiosk.joinSessionWithSeat(dto);
  }

}
