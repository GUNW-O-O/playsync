import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { DealerService } from 'src/dealer/dealer.service';
import { PlaysyncService } from 'src/playsync/playsync.service';

@WebSocketGateway({
  path: '/ws/playsync',
  cors: true
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // 테이블별 소켓관리
  private tableSessions = new Map<string, Set<WebSocket>>();
  constructor(
    private readonly dealer: DealerService,
    private readonly playsync: PlaysyncService,
    private readonly jwtService: JwtService,
  ) { }

  // 1. 연결 시 토큰 검증 및 테이블 입장
  async handleConnection(client: WebSocket, request: Request) {
    try {
      // URL에서 쿼리 스트링 추출 (ws://.../?tableId=xxx&token=yyy)
      const url = new URL(request.url, `http://${request.headers['host']}`);
      const tableId = url.searchParams.get('tableId');
      const token = url.searchParams.get('token');

      if (!tableId || !token) throw new Error('필수 정보 누락');

      // JWT 검증 (딜러 토큰이든 유저 토큰이든 JwtService가 해석)
      const payload = await this.jwtService.verifyAsync(token);

      // 소켓 객체에 유저 정보 저장 (나중에 액션 시 사용)
      (client as any).userId = payload.sub;
      (client as any).role = payload.role;
      (client as any).tableId = tableId;

      // 해당 테이블 세션 그룹에 추가 (Room 개념 구현)
      if (!this.tableSessions.has(tableId)) {
        this.tableSessions.set(tableId, new Set());
      }
      this.tableSessions.get(tableId)?.add(client);

      console.log(`User ${payload.sub} (${payload.role}) joined Table ${tableId}`);

      // 입장 성공 시 현재 상태 한 번 쏴주기 (Optional)
      // await this.broadcastGameState(tableId);

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
      }
    }
  }


}
