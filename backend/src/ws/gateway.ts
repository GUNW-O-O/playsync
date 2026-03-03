import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { WebSocket, Server } from 'ws';
import { RedisService } from '../redis/redis.service';
import { PlaysyncService } from 'src/playsync/playsync.service';
import { PlayerActionDto } from 'shared/dto/playsync.dto';

@WebSocketGateway({
  path: '/game-sync',
  transports: ['websocket'],
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // 현재 연결된 클라이언트 관리 (tableId 별로 그룹화)
  private clients: Map<string, Set<WebSocket>> = new Map();

  constructor(
    private readonly playsync: PlaysyncService,
    private readonly redis: RedisService,
  ) { }

  // 연결 시 유저 인증 및 테이블 룸 배정 (임시)
  async handleConnection(client: WebSocket, ...args: any[]) {
    console.log('Client connected via pure ws');
  }

  handleDisconnect(client: WebSocket) {
    // 모든 방을 순회하며 끊긴 클라이언트를 제거
    this.clients.forEach((sockets, tableId) => {
      if (sockets.has(client)) {
        sockets.delete(client);
        // 만약 방에 아무도 없다면 방 자체를 삭제하여 메모리 절약
        if (sockets.size === 0) {
          this.clients.delete(tableId);
        }
      }
    });
    console.log('Client removed from memory');
  }

  @SubscribeMessage('joinTable')
  async handleJoinTable(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: { tableId: string; userId: string; sessionId: string }
  ) {
    // 1. 유저 컨텍스트 저장
    await this.redis.setUserContext(data.sessionId, data.userId, data.tableId, 'WAITING');

    // 2. 내부 룸 관리 
    let tableRoom = this.clients.get(data.tableId);
    
    if (!tableRoom) {
      tableRoom = new Set();
      this.clients.set(data.tableId, tableRoom);
    }
    
    tableRoom.add(client);

    // 3. 현재 테이블 상태 전송
    const state = await this.redis.getSnapShot(data.tableId);
    client.send(JSON.stringify({ event: 'TABLE_SYNC', data: state }));
  }

  @SubscribeMessage('playerAction')
  async handlePlayerAction(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() dto: PlayerActionDto
  ) {
    // 1. 비즈니스 로직 처리 (TableEngine 연동)
    const updatedState = await this.playsync.handleAction(dto);

    // 2. 해당 테이블 인원에게만 브로드캐스트
    this.broadcastToTable(dto.tableId, {
      event: 'TABLE_SYNC',
      data: updatedState,
    });
  }

  private broadcastToTable(tableId: string, message: any) {
    const tableClients = this.clients.get(tableId);
    if (tableClients) {
      const payload = JSON.stringify(message);
      tableClients.forEach((socket) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(payload);
        }
      });
    }
  }

}