import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { TableEngine } from './table-engine';
import { HandState, ActionInput, GamePhase } from './types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GameEngineService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private prisma: PrismaService,
  ) {}

  // 1. 게임 시작: DB 정보를 읽어 Redis에 초기 상태 생성
  async initGame(tableId: string) {
    const tablePlayers = await this.prisma.tablePlayer.findMany({
      where: { sessionTableId: tableId },
      include: { user: true }
    });

    const initialState: HandState = {
      phase: GamePhase.WAITING,
      players: tablePlayers.map(tp => ({
        id: tp.userId,
        stack: tp.currentStack,
        bet: 0,
        hasFolded: false,
        isAllIn: false,
      })),
      buttonIndex: 0,
      currentTurnIndex: 0,
      pot: 0,
      currentBet: 0,
    };

    await this.redis.set(`table:${tableId}:state`, JSON.stringify(initialState));
    return initialState;
  }

  // 2. 플레이어 액션 처리
  async processAction(tableId: string, playerIndex: number, action: ActionInput, raiseAmount?: number) {
    const rawState = await this.redis.get(`table:${tableId}:state`);
    if (!rawState) throw new Error("Game state not found");

    const state: HandState = JSON.parse(rawState);
    const engine = new TableEngine(state); // 로직 주입

    await engine.act(playerIndex, action, raiseAmount); // 액션 실행

    // 핸드 종료(WAITING) 시 DB 업데이트
    if (engine.state.phase === GamePhase.WAITING) {
      await this.syncToDB(tableId, engine.state.players);
    }

    await this.redis.set(`table:${tableId}:state`, JSON.stringify(engine.state));
    return engine.state;
  }

  // 3. PostgreSQL 데이터 동기화
  private async syncToDB(tableId: string, players: any[]) {
    for (const p of players) {
      if (!p) continue;
      await this.prisma.tablePlayer.update({
        where: { sessionTableId_userId: { sessionTableId: tableId, userId: p.id } },
        data: { currentStack: p.stack }
      });
    }
  }
}