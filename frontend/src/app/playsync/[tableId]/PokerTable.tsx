import { TableState } from "@/app/types/game";

export default function PokerTable({ state, mySeatIndex }: { state: TableState | null, mySeatIndex: number | null }) {
  const seatStyles = [
    { top: '10%', left: '65%', transform: 'translateX(-50%)' },   // 0
    { top: '25%', right: '5%' },                                  // 1
    { top: '55%', right: '5%' },                                  // 2
    { bottom: '10%', right: '20%' },                              // 3
    { bottom: '5%', left: '50%', transform: 'translateX(-50%)' }, // 4
    { bottom: '10%', left: '20%' },                               // 5
    { top: '55%', left: '5%' },                                   // 6
    { top: '25%', left: '5%' },                                   // 7
    { top: '10%', left: '35%', transform: 'translateX(-50%)' },   // 8
  ];

  const mySeat = mySeatIndex ?? null;
  const phase = ['WAITING', 'PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN', 'HAND_END']

  return (
    <div className="w-full h-full relative flex items-center justify-center p-6 bg-slate-950">
      {/* 물리적 테이블 */}
      <div className="w-[90%] h-[75%] bg-emerald-900 rounded-[200px] border-[12px] border-amber-950 flex flex-col items-center justify-center shadow-2xl relative">
        <div className="text-white/5 text-4xl font-black italic select-none">PLAY SYNC</div>

        {state && (
          <div className="mt-4 flex flex-col items-center z-10">
            {/* POT 가독성: 배경 더 어둡게, 폰트 더 크게 */}
            <div className="bg-black/60 px-8 py-2 rounded-full text-2xl font-black text-yellow-400 border-2 border-yellow-500/30 shadow-lg">
              <span className="text-xs text-yellow-600 block text-center uppercase tracking-tighter">Total Pot</span>
              {state.pot.toLocaleString()}
            </div>
            <div className="text-white/60 text-sm mt-3 font-black uppercase tracking-[0.2em]">{phase[state.phase]}</div>
          </div>
        )}
      </div>

      {/* 좌석 렌더링 */}
      {Array.from({ length: 9 }).map((_, i) => {
        const player = state?.players[i] || null;
        const isCurrentTurn = state?.currentTurnSeatIndex === i;
        const isButton = state?.buttonUser === i;

        return (
          <div key={i} className="absolute transition-all duration-300 z-20" style={seatStyles[i]}>
            {/* 딜러 버튼 시인성: 크기 키움 */}
            {isButton && (
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-white border-2 border-slate-400 rounded-full flex items-center justify-center text-black font-black text-sm shadow-xl z-30">D</div>
            )}

            {/* 유저 박스: w-16 -> w-20 (시인성 확보를 위한 최소 크기) */}
            <div className={`w-20 h-22 rounded-2xl flex flex-col items-center justify-between py-2 border-2 transition-all shadow-2xl
              ${player ? 'bg-slate-900 border-slate-700' : 'bg-black/40 border-white/10 border-dashed'}
              ${isCurrentTurn ? 'border-yellow-400 ring-4 ring-yellow-400/30 scale-110 bg-slate-800' : ''}`}>

              {player ? (
                <>
                  {/* 상단: 번호 표시 (가독성 위해 톤 업) */}
                  <span className="text-[10px] text-blue-400 font-bold leading-none">
                    {i === mySeat ? '★ ME' : `${i + 1}번`}
                  </span>

                  {/* 중단: 닉네임 (글자 굵기 및 크기 최적화) */}
                  <span className={`text-[12px] font-black leading-tight truncate w-full text-center px-1 
                    ${i === mySeat ? 'text-rose-500' : 'text-slate-100'}`}>
                    {player.nickname}
                  </span>

                  {/* 하단: 스택 (밝은 노란색으로 강조) */}
                  <span className="text-yellow-300 text-[13px] font-black tracking-tight">
                    {player.stack.toLocaleString()}
                  </span>

                  {/* 베팅 금액: 시인성 대폭 강화 (강렬한 파란색) */}
                  {player.bet > 0 && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] px-3 py-1 rounded-full font-black shadow-[0_4px_10px_rgba(37,99,235,0.4)] border border-blue-400 whitespace-nowrap">
                      {player.bet.toLocaleString()}
                    </div>
                  )}

                  {/* 폴드: 암전 효과 강화 */}
                  {player.hasFolded && (
                    <div className="absolute inset-0 bg-black/80 rounded-xl flex items-center justify-center z-10 backdrop-blur-[1px]">
                      <span className="text-xs font-black text-slate-500 border border-slate-700 px-2 py-0.5 rounded italic">FOLD</span>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-white/5 font-bold text-[10px] tracking-tighter uppercase">Empty</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}