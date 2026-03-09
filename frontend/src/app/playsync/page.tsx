// src/app/playsync/page.tsx (Server Component)
import { cookies } from 'next/headers';
import Link from 'next/link';

async function getMyJoinedTables() {
  const token = (await cookies()).get('accessToken')?.value;
  // 백엔드: GET /tournaments/my-tables (본인이 속한 TablePlayer 목록 반환)
  const res = await fetch(`${process.env.BACKEND_URL}/tournaments/my-tables`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function PlaySyncMain() {
  const tables = await getMyJoinedTables();

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">내 게임 목록</h1>
      <div className="space-y-4">
        {tables.length > 0 ? tables.map((item: any) => (
          <Link 
            key={item.tableId} 
            href={`/playsync/${item.tableId}`}
            className="block p-5 border rounded-2xl bg-white hover:border-indigo-500 transition shadow-sm"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">{item.tournamentName}</p>
                <p className="text-sm text-gray-500">{item.tableOrder}번 테이블 - {item.seatIndex + 1}번석</p>
              </div>
              <span className="text-indigo-600 font-bold">입장하기 →</span>
            </div>
          </Link>
        )) : (
          <p className="text-gray-500">참여 중인 대회가 없습니다.</p>
        )}
      </div>
    </div>
  );
}