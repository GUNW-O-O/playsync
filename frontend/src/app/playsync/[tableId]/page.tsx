// src/app/playsync/[tableId]/page.tsx (Server Component)
import { cookies } from 'next/headers';
import GameClient from './GameClient';

async function getInitialGameData(tableId: string) {
  const token = (await cookies()).get('accessToken')?.value;
  const res = await fetch(`${process.env.BACKEND_URL}/playsync/${tableId}`, {
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
      {initialData.statusCode === 200 ? (
        <GameClient
          tableId={tableId} 
          initialData={initialData} 
        />
      ) : (
        <p>아직 게임이 시작되지 않았습니다.</p>
      )}
    </main>
  );
}