import React from 'react'

const KioskSession = ({ params }: { params: { sessionId: string } }) => {
  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">테이블 및 좌석 선택</h1>

      {/* 여러 개의 테이블이 있을 경우 리스트/그리드 표시 */}
      <div className="space-y-12">
        <section>
          <h2 className="text-xl font-semibold mb-4 text-blue-300">1번 테이블</h2>
          {/* SeatMap 컴포넌트 호출 */}
          {/* <SeatMap tableId="table-uuid-1" /> */}
        </section>
      </div>
    </div>
  )
}

export default KioskSession