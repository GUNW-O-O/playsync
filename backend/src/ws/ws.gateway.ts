import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { DealerService } from 'src/dealer/dealer.service';
import { PlaysyncService } from 'src/playsync/playsync.service';
import { RedisService } from 'src/redis/redis.service';

@WebSocketGateway({
  path: '/playsync',
  cors: true
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // 테이블별 소켓관리
  private tableSessions = new Map<string, Set<WebSocket>>();
  constructor(
    private readonly dealer: DealerService,
    private readonly playsync: PlaysyncService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
  ) { }

  // 1. 연결 시 토큰 검증 및 테이블 입장
  async handleConnection(client: WebSocket, request: any) {
    try {
      const url = new URL(request.url, `http://${request.headers['host']}`);
      const tableId = url.searchParams.get('tableId');
      const token = url.searchParams.get('token');

      if (!tableId || !token) throw new Error('필수 정보 누락');

      // JWT 검증 (딜러 토큰이든 유저 토큰이든 JwtService가 해석)
      const payload = await this.jwtService.verifyAsync(token);

      // 소켓 객체에 유저 정보 저장 (나중에 액션 시 사용)
      (client as any).userId = payload.sub;
      (client as any).role = payload.role;
      (client as any).tableId = tableId || payload.tableId;
      (client as any).tournamentId = payload.tournamentId || null;

      let sessions = this.tableSessions.get(tableId);
      if (!sessions) {
        sessions = new Set<WebSocket>();
        this.tableSessions.set(tableId, sessions);
      }
      // 이제 sessions는 무조건 Set<WebSocket> 타입으로 고정
      sessions.add(client);

      console.log(`User ${payload.sub} (${payload.role}) joined Table ${tableId}`);

      const updatedState = await this.redis.getSnapShot(tableId);
      await this.broadcastToTable(tableId, 'renderGame', updatedState);

    } catch (err) {
      console.error('연결 거부:', err.message);
      client.close(1008, '인증 실패');
    }
  }

  // 2. 연결 종료 시 세션 제거
  handleDisconnect(client: WebSocket) {
    const tableId = (client as any).tableId;
    if (tableId && this.tableSessions.has(tableId)) {
      this.tableSessions.get(tableId)?.delete(client);
      if (this.tableSessions.get(tableId)?.size === 0) {
        this.tableSessions.delete(tableId);
      } else {
        console.log(`User left Table ${tableId}`);
      }
    }
  }

  // 테이블 브로드캐스트 유틸리티
  private broadcastToTable(tableId: string, event: string, data: any) {
    const sessions = this.tableSessions.get(tableId);
    if (sessions) {
      const message = JSON.stringify({ event, data });
      sessions.forEach(s => s.send(message));
    }
  }

  @SubscribeMessage('PLAYER_ACTION')
  async handlePlayerAction(@ConnectedSocket() client: any, @MessageBody() data: any) {
    const { tableId, userId, role } = client;

    // 유저 권한 체크
    // if (role !== 'USER') return { event: 'error', data: '플레이어만 가능한 액션입니다.' };

    try {
      // GameService에서 실제 포커 로직 처리 (스택 차감, 턴 넘기기 등)
      const updatedState = await this.playsync.handleAction(userId, tableId, { action: data.action, amount: data.amount });

      // 해당 테이블의 모든 인원에게 변경된 상태 브로드캐스트
      this.broadcastToTable(tableId, 'renderGame', updatedState);
    } catch (e) {
      return { event: 'error', data: e.message };
    }
  }

  @SubscribeMessage('DEALER_ACTION')
  async handleDealerAction(@ConnectedSocket() client: any, @MessageBody() data: any) {
    const { tableId, role, tournamentId } = client;

    if (role !== 'DEALER') return { event: 'error', data: '딜러만 가능한 액션입니다.' };
    let updatedState;

    switch (data.action) {
      case 'START_PRE_FLOP':
        updatedState = await this.dealer.startPreFlop(tournamentId, tableId);
        break;
      case 'RESOLVE_WINNERS':
        updatedState = await this.dealer.resolveWinners(tableId, tournamentId, data.winnerUserIds);
        break;
      case 'DEALER_FOLD':
        updatedState = await this.dealer.handleDealerAction(tournamentId, tableId, data.targetUserId, 'FOLD');
        break;
      case 'DEALER_KICK':
        updatedState = await this.dealer.handleDealerAction(tournamentId, tableId, data.targetUserId, 'KICK');
        break;
    }

    this.broadcastToTable(tableId, 'renderGame', updatedState);
  }

  // 타임아웃 프로세서
  @OnEvent('game.state.updated')
  handleGameStateUpdated(payload: { tableId: string; state: any }) {
    this.broadcastToTable(payload.tableId, 'renderGame', payload.state);
  }


}
