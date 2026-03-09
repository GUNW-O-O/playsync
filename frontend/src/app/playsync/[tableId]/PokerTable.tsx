import { TableState } from "@/app/types/game";

export default function PokerTable({ state }: { state: TableState | null }) {
  const seatStyles = [
    { bottom: '5%', left: '50%', transform: 'translateX(-50%)' }, // 0
    { bottom: '15%', left: '15%' },                               // 1
    { top: '50%', left: '5%', transform: 'translateY(-50%)' },    // 2
    { top: '15%', left: '15%' },                                  // 3
    { top: '5%', left: '50%', transform: 'translateX(-50%)' },    // 4
    { top: '15%', right: '15%' },                                 // 5
    { top: '50%', right: '5%', transform: 'translateY(-50%)' },   // 6
    { bottom: '15%', right: '15%' },                              // 7
    { bottom: '5%', right: '30%' },                               // 8
  ];

  return (
    <div className="w-full h-full relative flex items-center justify-center p-10">
      {/* 물리적 테이블 형태 */}
      <div className="w-[90%] h-[75%] bg-emerald-900 rounded-[200px] border-[12px] border-amber-900 flex flex-col items-center justify-center shadow-2xl relative">
        <div className="text-white/10 text-6xl font-black italic select-none">PLAY SYNC</div>
        
        {state && (
          <div className="mt-4 flex flex-col items-center">
            <div className="bg-black/40 px-6 py-2 rounded-full text-2xl font-bold text-yellow-400 border border-yellow-600/30">
              POT: {state.pot.toLocaleString()}
            </div>
            <div className="text-white/40 text-sm mt-2 font-bold uppercase tracking-widest">{state.phase}</div>
          </div>
        )}
      </div>

      {/* 9개 좌석 렌더링 */}
      {Array.from({ length: 9 }).map((_, i) => {
        const player = state?.players[i] || null;
        const isCurrentTurn = state?.currentTurnSeatIndex === i;
        const isButton = state?.buttonUser === i;

        return (
          <div key={i} className="absolute transition-all duration-500" style={seatStyles[i]}>
            {isButton && (
              <div className="absolute -top-3 -right-3 w-7 h-7 bg-white border border-slate-300 rounded-full flex items-center justify-center text-black font-black text-xs shadow-md z-10">D</div>
            )}
            <div className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 transition-all
              ${player ? 'bg-slate-800 border-slate-600' : 'bg-black/20 border-white/10 border-dashed'}
              ${isCurrentTurn ? 'border-yellow-400 ring-4 ring-yellow-400/20 scale-110' : ''}`}>
              
              {player ? (
                <>
                  <span className="text-[10px] text-slate-500 font-bold mb-1">{i}번석</span>
                  <span className="text-xs font-black truncate w-full text-center px-1">{player.nickname}</span>
                  <span className="text-yellow-400 text-sm font-bold">{player.stack.toLocaleString()}</span>
                  {player.bet > 0 && (
                    <div className="absolute -top-8 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                      {player.bet.toLocaleString()}
                    </div>
                  )}
                  {player.hasFolded && <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center text-xs font-bold text-red-500">FOLDED</div>}
                </>
              ) : (
                <span className="text-white/10 font-bold text-xs italic">{i}번 EMPTY</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}