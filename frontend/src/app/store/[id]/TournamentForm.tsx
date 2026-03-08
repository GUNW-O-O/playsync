'use client';

import { useState } from 'react';
import { createTournamentWithBlinds } from './action';

export default function TournamentForm({ storeId }: { storeId: string }) {
  // 1. 상태 분리
  const [blindName, setBlindName] = useState('기본 블라인드 설정');
  const [structure, setStructure] = useState([
    { lv: 1, sb: 100, ante: false, duration: 5 }
  ]);

  // 레벨 추가 로직
  const addLevel = () => {
    const last = structure[structure.length - 1];
    setStructure([
      ...structure,
      { lv: last.lv + 1, sb: last.sb * 2, ante: false, duration: 5 }
    ]);
  };

  // 레벨 값 변경 로직
  const handleLevelChange = (index: number, field: string, value: any) => {
    const newStructure = [...structure];
    newStructure[index] = { ...newStructure[index], [field]: value };
    setStructure(newStructure);
  };

  // 2. 서버 액션 실행 함수
  async function handleSubmit(formData: FormData) {
    // 제출 직전에 DTO 형식에 맞춰서 데이터 조립
    const blindDto = {
      name: blindName,
      structure: structure,
      storeId: storeId,
    };

    formData.append('blindData', JSON.stringify(blindDto));
    const result = await createTournamentWithBlinds(storeId, formData);

    if (result?.error) alert(result.error);
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <input name="name" placeholder="대회 제목" className="w-full border p-2 rounded text-gray-500" required />
        {/* <input name="type" type="text" placeholder="타입" className="w-full border p-2 rounded" required /> */}
        <input name="entryFee" type="number" placeholder="참가비" className="w-full border p-2 rounded text-gray-500" required />
        <input name="startStack" type="number" placeholder="시작 스택" className="w-full border p-2 rounded text-gray-500" required />
        <input name="rebuyUntil" type="number" placeholder="레지 마감 LV" className="w-full border p-2 rounded text-gray-500" required />
        <input name="itmCount" type="number" placeholder="ITM 인원" className="w-full border p-2 rounded text-gray-500" required />
        {/* <input name="isRegistrationOpen" type="number" placeholder="참가비" className="w-full border p-2 rounded" required /> */}
      </div>

      {/* 블라인드 설정 */}
      <div className="space-y-4 pt-4">
        <h3 className="font-bold text-lg border-b pb-2">2. 블라인드 설정</h3>

        {/* 블라인드 이름 입력 */}
        <div>
          <label className="text-sm text-gray-500">블라인드 구조 명칭</label>
          <input
            value={blindName}
            onChange={(e) => setBlindName(e.target.value)}
            className="w-full border p-2 rounded mt-1"
          />
        </div>

        {/* 블라인드 레벨 리스트 */}
        <div className="space-y-2">
          {structure.map((item, i) => (
            <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
              <span className="w-10 font-bold text-center text-blue-600">Lv.{item.lv}</span>
              <input
                type="number"
                value={item.sb}
                onChange={(e) => handleLevelChange(i, 'sb', +e.target.value)}
                className="w-full border p-1 rounded"
                placeholder="SB"
              />
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">Ante</span>
                <input
                  type="checkbox"
                  checked={item.ante}
                  onChange={(e) => handleLevelChange(i, 'ante', e.target.checked)}
                />
              </div>
              <input
                type="number"
                value={item.duration}
                onChange={(e) => handleLevelChange(i, 'duration', +e.target.value)}
                className="w-16 border p-1 rounded text-center"
              />
              <span className="text-xs">분</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addLevel}
          className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded hover:bg-gray-50"
        >
          + 레벨 추가
        </button>
      </div>

      <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition">
        대회 개최 및 블라인드 저장
      </button>
    </form>
  );
}