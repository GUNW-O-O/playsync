import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { KioskPayMentDto } from "shared/dto/kiosk.dto";

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  // 좌석 선점 시도
  async acquireSeatLock(dto: KioskPayMentDto): Promise<boolean> {
    const lockKey = `lock:seat:${dto.sessionId}:${dto.tableId}:${dto.seatIndex}`;
    const expireTime = 10;

    // NX: 키가 없을 때만 세팅, EX: 만료 시간 설정
    const result = await this.redis.set(lockKey, dto.userId, 'EX', expireTime, 'NX');
    
    return result === 'OK'; // 성공하면 true, 이미 누가 점유 중이면 false
  }

  // 락 해제 (결제 완료 후 또는 취소 시)
  async releaseSeatLock(dto: KioskPayMentDto) {
    const lockKey = `lock:seat:${dto.sessionId}:${dto.tableId}:${dto.seatIndex}`;
    await this.redis.del(lockKey);
  }
}