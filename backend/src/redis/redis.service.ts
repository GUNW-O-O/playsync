import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { KioskPayMentDto } from "shared/dto/kiosk.dto";
import { BlindTimingResult } from "shared/types/blind";
import { BlindField, Dashboard } from "shared/types/tournamentMeta";
import { UserInfo } from "shared/types/userInfo";
import { TableState } from "src/game-engine/types";

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) { }

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

  async updateSeatBitmap(tournamentId: string, tableId: string, seatIndex: number, isOccupied: boolean) {
    const key = `tournament:seat:${tournamentId}`;
    const field = `table:${tableId}`;

    // 자리가 비었으면 0
    let bitmap = await this.redis.hget(key, field) || "000000000";
    const bitmapArray = bitmap.split("");
    bitmapArray[seatIndex] = isOccupied ? "1" : "0";

    await this.redis.hset(key, field, bitmapArray.join(""));
  }

  // 초기 생성 대회정보
  async setTournamentMeta(id: string, dashboard: any, blindField: any) {
    const key = `tournament:${id}:info`;
    await this.redis.hset(
      key,
      'dashboard', JSON.stringify(dashboard),
      'blindField', JSON.stringify(blindField)
    );
    // 데이터 유실 방지를 위해 적절한 TTL 설정 (예: 24시간)
    await this.redis.expire(key, 86400);
  }

  async getTournamentDashboard(id: string): Promise<Dashboard | null> {
    const data = await this.redis.hget(`tournament:${id}:info`, 'dashboard');
    return data ? JSON.parse(data) : null;
  }

  async setTournamentDashboard(id: string, dashboard: Dashboard) {
    await this.redis.hset(`tournament:${id}:info`, 'dashboard', JSON.stringify(dashboard));
  }

  async getTournamentBlind(id: string): Promise<BlindField | null> {
    const data = await this.redis.hget(`tournament:${id}:info`, 'blindField');
    return data ? JSON.parse(data) : null;
  }

  async setTournamentBlind(id: string, blindField: BlindField) {
    await this.redis.hset(`tournament:${id}:info`, 'blindField', JSON.stringify(blindField));
  }

  // 초기 생성 파이프라인
  async saveInitialTableSnapshots(tableStates: { tableId: string; state: TableState }[]) {
    const pipeline = this.redis.pipeline();

    tableStates.forEach(({ tableId, state }) => {
      const key = `table:state:${tableId}`;
      pipeline.set(key, JSON.stringify(state));
    });

    await pipeline.exec();
    // const results = 
    // 에러 핸들링 (선택 사항)
    // results?.forEach(([err, response], index) => {
    //   if (err) console.error(`Table ${tableStates[index].tableId} save failed:`, err);
    // });
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
  async setUserContext(tournamentId: string, userId: string, tableId: string, seatIndex: number, status: string) {
    await this.redis.set(`user:${userId}`, `${tournamentId}:${tableId}:${seatIndex}:${status}`);
  }

  // 유저 위치 정보 가져오기
  async getUserContext(userId: string): Promise<UserInfo> {
    const raw = await this.redis.get(`user:${userId}`);
    if (!raw) throw new Error(`User ${userId} not found`);
    return JSON.parse(raw);
  }
}