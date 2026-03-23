'use client';

import { useState, useEffect, use } from 'react';
import { joinTournament } from '../action';

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [data, setData] = useState<any>(null);
  const [selectedSeat, setSelectedSeat] = useState<{ tableId: string, index: number } | null>(null);

  // 실시간 좌석 정보를 위해 클라이언트에서 페칭 (혹은 웹소켓 권장)
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tournaments/${id}`).then(res => res.json()).then(setData);
  }, [id]);

  if (!data || !data.tournament) return <div>데이터 구성 중...</div>;

  const { tournament, seatStatus } = data;
  console.log(data)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{tournament.name}</h1>
        <p className="text-gray-500">{tournament.entryFee.toLocaleString()}원 | ITM: {tournament.itmCount}명</p>
      </div>

      <h2 className="text-xl font-bold mb-4">좌석 선택</h2>
      <div className="space-y-8">
        {data.seatStatus.map((tableObj: any) => {
          // 각 테이블 객체에서 필요한 정보를 꺼냅니다.
          const { tableId, seatStatus: seats } = tableObj;

          return (
            <div key={tableId} className="bg-gray-100 p-6 rounded-3xl border-4 border-gray-300 relative overflow-hidden">
              <div className="text-center font-bold text-gray-400 mb-4 italic">
                {tournament.tables.find((t: any) => t.id === tableId)?.tableOrder}번 테이블
              </div>

              <div className="grid grid-cols-9 gap-3 relative">
                {seats.map((isOccupied: boolean, idx: number) => (
                  <button
                    key={idx}
                    disabled={isOccupied}
                    onClick={() => setSelectedSeat({ tableId, index: idx })}
                    className={`
                h-10 w-10 rounded-full border-2 flex items-center justify-center font-bold transition
                ${isOccupied ? 'bg-red-200 border-red-400 text-red-700 cursor-not-allowed' :
                        selectedSeat?.index === idx && selectedSeat?.tableId === tableId
                          ? 'bg-yellow-400 border-yellow-600 scale-110 shadow-lg'
                          : 'bg-white border-gray-300 hover:border-indigo-500'}
              `}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedSeat && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-2xl flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-500">{tournament.name}</span>
            <p className="font-bold">{
              tournament.tables.find((t: any) => t.id === selectedSeat.tableId)?.tableOrder
            }번 테이블 - {selectedSeat.index + 1}번석</p>
          </div>
          <button
            onClick={() => joinTournament(id, selectedSeat.tableId, selectedSeat.index)}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700"
          >
            참가 결제하기
          </button>
        </div>
      )}
    </div>
  );
}