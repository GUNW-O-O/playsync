'use client'

import { useState } from 'react';
import { getTournamentsByShop, searchShops } from './action';
import Link from 'next/link';

export default function ShopSearchPage() {
  const [query, setQuery] = useState('');
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [tournament, setTournament] = useState<any[]>([]);

  // 임시 테넌트 ID (실제로는 세션이나 URL 파라미터에서 가져옴)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const results = await searchShops(query);
    setShops(results);
    setSelectedShop(null); // 검색 시 이전 선택 초기화
  };

  const handleShopClick = async (shopId: string) => {
    setSelectedShop(shopId);
    const data = await getTournamentsByShop(shopId);
    setTournament(data);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">상점 검색</h1>
      
      {/* 검색창 */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="상점 이름을 입력하세요..."
          className="flex-1 border p-2 rounded text-black"
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          검색
        </button>
      </form>

      <div className="grid grid-cols-2 gap-8">
        {/* 상점 리스트 */}
        <div>
          <h2 className="text-lg font-semibold mb-4">검색 결과</h2>
          <ul className="space-y-2">
            {shops.map((shop) => (
              <li 
                key={shop.id}
                onClick={() => handleShopClick(shop.id)}
                className={`p-3 border rounded cursor-pointer hover:bg-gray-100 ${selectedShop === shop.id ? 'border-blue-500 bg-blue-50' : ''}`}
              >
                {shop.name}
              </li>
            ))}
            {shops.length === 0 && <p className="text-gray-500">검색 결과가 없습니다.</p>}
          </ul>
        </div>

        {/* 대회 리스트 */}
        <div>
          <h2 className="text-lg font-semibold mb-4">참여 가능 대회</h2>
          {selectedShop ? (
            <ul className="space-y-2">
              {tournament.map((t) => (
                <li key={t.id} className="p-3 bg-gray-50 border rounded">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-gray-600">{t.activePlayers} / {t.totalPlayers}</p>
                  <Link href={`/tournaments/${t.id}`} className="text-blue-500 hover:underline">플레이어참가</Link>
                  <Link href={`/dealer/${t.id}`} className="text-blue-500 hover:underline">딜러참가</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">상점을 선택해주세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}