import React from 'react'

const KioskStore = ({ params }: { params: { storeId: string } }) => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8 text-white">참여 가능한 토너먼트</h1>
      <div className="grid grid-cols-2 gap-6">
        {/* 예시 카드 */}
        <div className="bg-slate-800 p-6 rounded-2xl border-2 border-slate-700 hover:border-blue-500 transition-all cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <span className="bg-blue-600 text-xs px-2 py-1 rounded">모집 중</span>
            <span className="text-xl font-bold text-blue-400">30,000P</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">데일리 터보 토너먼트</h2>
          <p className="text-slate-400">현재 참여 인원: 12 / 27</p>
        </div>
      </div>
    </div>
  )
}

export default KioskStore