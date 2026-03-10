'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function DealerAuthPage() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/dealer`)
      .then(res => res.json())
      .then(data => {
        setTournaments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);
  console.log(tournaments)

  const handleAuth = async () => {
    if (!selectedTournament) {
      alert('대회를 먼저 선택해주세요.');
      return;
    }
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
      Cookies.set('dealerToken', accessToken, { 
        expires: 1,
        path: '/',
        sameSite: 'lax',
        // secure: true
      });
      alert(`인증 성공 tableId: ${selectedTable}`);
      router.push(`/playsync`);
      // router.push(`/playsync/${selectedTable}`);
    } else {
      alert('인증 실패: OTP를 확인하세요.');
    }
  };

  if (loading) return <div className="p-8 text-center">데이터 로딩 중...</div>;

  return (
    <div className="p-8 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">딜러 테이블 인증</h1>

      {/* 대회 선택 */}
      <select
        onChange={(e) => {
          const tournament = tournaments.find((t: any) => t.id === e.target.value);
          setSelectedTournament(tournament);
        }}
        className="w-full p-3 border rounded-xl"
        value={selectedTournament?.id || ""}
      >
        <option value="">대회 선택</option>
        {tournaments.map((t: any) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      {selectedTournament && (
        <select
          onChange={(e) => setSelectedTable(e.target.value)}
          className="w-full p-3 border rounded-xl"
        >
          <option value="">테이블 선택</option>
          {/* ?. 을 사용하여 tables가 없을 경우를 대비합니다 */}
          {selectedTournament.tables?.map((table: any) => (
            <option key={table.id} value={table.id}>
              {table.tableOrder}번 테이블
            </option>
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

      <button
        onClick={handleAuth}
        disabled={!selectedTable || !otp} // 버튼 활성화 조건 추가
        className="w-full bg-black text-white py-4 rounded-xl font-bold disabled:bg-gray-400"
      >
        테이스팅 시작 (인증)
      </button>
    </div>
  );
}