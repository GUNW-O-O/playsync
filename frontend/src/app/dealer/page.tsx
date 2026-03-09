'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DealerAuthPage() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState('');
  const [otp, setOtp] = useState('');
  const router = useRouter();

  // 1. 대회 목록 조회
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/dealer`).then(res => res.json()).then(setTournaments);
  }, []);

  const handleAuth = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/dealer/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournamentId: selectedTournament.id,
        tableId: selectedTable,
        otp: Number(otp)
      })
    });

    if (res.ok) {
      const { accessToken } = await res.json();
      // 딜러 전용 토큰을 저장 (플레이어 토큰과 별개로 관리하거나 교체)
      localStorage.setItem('dealerToken', accessToken);
      router.push(`/playsync/${selectedTable}`);
    } else {
      alert('인증 실패: OTP를 확인하세요.');
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">딜러 테이블 인증</h1>
      
      {/* 대회 선택 */}
      <select 
        onChange={(e) => setSelectedTournament(tournaments.find((t: any) => t.id === e.target.value))}
        className="w-full p-3 border rounded-xl"
      >
        <option value="">대회 선택</option>
        {tournaments.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      {/* 테이블 선택 (대회 선택 시 나타남) */}
      {selectedTournament && (
        <select 
          onChange={(e) => setSelectedTable(e.target.value)}
          className="w-full p-3 border rounded-xl"
        >
          <option value="">테이블 선택</option>
          {selectedTournament.tables.map((table: any) => (
            <option key={table.id} value={table.id}>{table.tableOrder}번 테이블</option>
          ))}
        </select>
      )}

      <input 
        type="number" 
        placeholder="4자리 OTP 입력" 
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        className="w-full p-3 border rounded-xl text-center text-2xl tracking-widest"
      />

      <button onClick={handleAuth} className="w-full bg-black text-white py-4 rounded-xl font-bold">
        테이스팅 시작 (인증)
      </button>
    </div>
  );
}