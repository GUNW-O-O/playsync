// src/app/playsync/[tableId]/page.tsx (Server Component)
import { cookies } from 'next/headers';
import GameClient from './GameClient';

async function getInitialGameData(tableId: string) {
  const token = (await cookies()).get('accessToken')?.value;
  const res = await fetch(`${process.env.BACKEND_URL}/tournaments/info/${tableId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  });
  return res.json();
}

export default async function GamePage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await params;
  const initialData = await getInitialGameData(tableId);

  return (
    <main className="h-screen bg-slate-900 overflow-hidden">
      {/* 클라이언트 컴포넌트에 초기 데이터를 Props로 전달 */}
      <GameClient
        tableId={tableId} 
        initialData={initialData} 
      />
    </main>
  );
}