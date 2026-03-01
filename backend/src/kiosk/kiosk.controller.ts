import { Body, ConflictException, Controller, Post } from '@nestjs/common';
import { KioskPayMentDto } from 'shared/dto/kiosk.dto';
import { RedisService } from 'src/redis/redis.service';

@Controller('kiosk')
export class KioskController {
  constructor(private readonly redisService: RedisService) {}


  @Post('reserve-seat')
  async reserve(@Body() dto: KioskPayMentDto) {
    const isLocked = await this.redisService.acquireSeatLock(dto);

    if (!isLocked) {
      throw new ConflictException('이미 다른 유저가 선택 중인 좌석입니다.');
    }
    return { message: '좌석이 5분간 선점되었습니다.' };
  }

}
