'use client';

import { useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import PokerTable from './PokerTable';
import { TableState } from '@/app/types/game';
import ActionPanel from './ActionPanel';

export default function GameClient({ tableId, initialData, seatIndex }: { tableId: string, initialData?: TableState, seatIndex: number }) {
  const socketRef = useRef<WebSocket | null>(null);
  const [gameState, setGameState] = useState<TableState | null>(initialData || null);
  const [mySeatIndex, setMySeatIndex] = useState<number | null>(seatIndex ?? null);
  const [isDealer, setIsDealer] = useState<boolean>(false); // 딜러 세션 여부

  useEffect(() => {
    const token = Cookies.get('dealerToken') || Cookies.get('accessToken');
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}?tableId=${tableId}&token=${token}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    
    ws.onmessage = (event) => {
      const { event: serverEvent, data } = JSON.parse(event.data);
      if (serverEvent === 'renderGame') setGameState(data);
    };
    
    return () => ws.close();
  }, [tableId]);

  if(Cookies.get('dealerToken') && seatIndex === -1 ) {
    setIsDealer(true);
  }

  const sendAction = (type: string, payload: any = {}) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const token = Cookies.get('accessToken') || Cookies.get('dealerToken');
      socketRef.current.send(JSON.stringify({
        event: type,
        data: { ...payload, token, tableId }
      }));
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-white overflow-hidden p-2 gap-2">
      {/* 3/2 영역: 포커 테이블 (고정 레이아웃) */}
      <div className="flex-[2] relative bg-slate-900 rounded-3xl border border-slate-800 shadow-inner overflow-hidden">
        <PokerTable state={gameState} />
      </div>

      {/* 1/3 영역: 컨트롤 패널 (유저/딜러 분기) */}
      <div className="flex-[1] flex flex-col bg-slate-900 rounded-3xl border border-slate-800 p-4 overflow-y-auto">
        <ActionPanel
          state={gameState}
          mySeatIndex={mySeatIndex}
          isDealer={isDealer}
          onAction={sendAction}
        />
      </div>
    </div>
  );
}