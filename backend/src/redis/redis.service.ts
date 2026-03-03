import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { KioskPayMentDto } from "shared/dto/kiosk.dto";
import { BlindTimingResult } from "shared/util/util";
import { TableState } from "src/game-engine/types";

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  // 좌석 선점 시도
  async acquireSeatLock(dto: KioskPayMentDto): Promise<boolean> {
    const lockKey = `lock:seat:${dto.tableId}:${dto.seatIndex}`;
    const expireTime = 10;

    // NX: 키가 없을 때만 세팅, EX: 만료 시간 설정
    const result = await this.redis.set(lockKey, dto.userId, 'EX', expireTime, 'NX');
    
    return result === 'OK'; // 성공하면 true, 이미 누가 점유 중이면 false
  }

  // 락 해제 (결제 완료 후 또는 취소 시)
  async releaseSeatLock(dto: KioskPayMentDto) {
    const lockKey = `lock:seat:${dto.tableId}:${dto.seatIndex}`;
    await this.redis.del(lockKey);
  }
  
  // 세션 블라인드 (블라인드 레벨, 시작시간, 다음시간)
  async setSessionBlinds(id: string, dto: BlindTimingResult){
    await this.redis.set(`${id}`,JSON.stringify(dto));
  }
  // 세션 블라인드
  async getSessionBlinds(id: string): Promise<BlindTimingResult> {
    const data = await this.redis.get(`${id}`);
    if (!data) throw new Error('블라인드 정보 없음');
    return JSON.parse(data);
  }

  // Table 상태 저장
  async saveSnapShot(tableId: string, table: TableState) {
    await this.redis.set(`table:state:${tableId}`, JSON.stringify(table));
  }

  // Table 가져오기
  async getSnapShot(tableId: string): Promise<TableState> {
    const rawState = await this.redis.get(`table:state:${tableId}`);
    if (!rawState) throw new Error(`Table ${tableId} not found`);
    return JSON.parse(rawState);
  }

  // 유저의 위치,정보 저장
  async setUserContext(tournamentId:string, userId: string, tableId: string, seatIndex: number, status: string) {
    await this.redis.set(`user:${userId}`, `${tournamentId}:${tableId}:${seatIndex}:${status}`);
  }

  // 유저 위치 정보 가져오기
  async getUserContext(userId: string): Promise<UserInfo> {
    const raw = await this.redis.get(`user:${userId}`);
    if (!raw) throw new Error(`User ${userId} not found`);
    return JSON.parse(raw);
  }
}

// 
export interface UserInfo{
  tournamentId: string;
  tableId: string;
  seatIndex: number;
  status: string;
}