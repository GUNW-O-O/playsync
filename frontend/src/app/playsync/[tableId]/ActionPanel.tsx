import { useState } from "react";

export default function ActionPanel({ state, mySeatIndex, isDealer, onAction }: any) {
  if (!state) return <div className="text-slate-600 text-center mt-10 italic">게임 시작 대기 중...</div>;

  return (
    <div className="h-full flex flex-col gap-4">
      {isDealer ? (
        <DealerSection state={state} onAction={onAction} />
      ) : (
        <PlayerSection state={state} mySeatIndex={mySeatIndex} onAction={onAction} />
      )}
    </div>
  );
}

// 플레이어 섹션 (BB 기준 슬라이더 포함)
function PlayerSection({ state, mySeatIndex, onAction }: any) {
  const bigBlind = 1000; // 실제로는 state에서 가져오거나 상수로 관리
  const [raiseVal, setRaiseVal] = useState(bigBlind * 2);
  const myPlayer = state.players[mySeatIndex];

  if (state.currentTurnSeatIndex !== mySeatIndex) {
    return <div className="flex-1 flex items-center justify-center text-slate-500 font-bold italic animate-pulse">상대방 턴 대기 중...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-indigo-400 font-black text-sm uppercase">Player Actions</h2>
      
      {/* BB 슬라이더 */}
      <div className="bg-black/40 p-3 rounded-xl space-y-3 border border-white/5">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-slate-400">RAISE AMOUNT</span>
          <span className="text-yellow-400">{raiseVal.toLocaleString()}</span>
        </div>
        <input 
          type="range" min={state.currentBet + bigBlind} max={myPlayer?.stack} step={bigBlind}
          value={raiseVal} onChange={(e) => setRaiseVal(Number(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none accent-indigo-500"
        />
        <div className="grid grid-cols-4 gap-1">
          {[2, 3, 5, 10].map(bb => (
            <button key={bb} onClick={() => setRaiseVal(bigBlind * bb)} className="bg-slate-800 py-1 rounded text-[10px] font-bold hover:bg-indigo-600">
              {bb}BB
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onAction('FOLD')} className="h-14 bg-red-700 rounded-xl font-black">FOLD</button>
        <button onClick={() => onAction('CHECK')} className="h-14 bg-slate-700 rounded-xl font-black text-xs">CHECK</button>
        <button onClick={() => onAction('CALL', { amount: state.currentBet })} className="h-14 bg-blue-700 rounded-xl font-black">CALL</button>
        <button onClick={() => onAction('RAISE', { amount: raiseVal })} className="h-14 bg-indigo-700 rounded-xl font-black">RAISE</button>
      </div>
    </div>
  );
}

// 딜러 섹션 (승자 선택 포함)
function DealerSection({ state, onAction }: any) {
  const [winners, setWinners] = useState<string[]>([]);
  const [phase, setPhase] = useState(state.phase);
  const resolveWinner = async () => {
  }
  const startPreFlop = async () => {
  }
  const dealerAction = async () => {
  }


  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-amber-500 font-black text-sm uppercase">Dealer Console</h2>
      <div className="grid grid-cols-3 gap-1">
        {state.players.map((p: any, i: number) => p && (
          <button 
            key={p.id} onClick={() => setWinners(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
            className={`p-2 rounded text-[10px] border font-bold ${winners.includes(p.id) ? 'bg-yellow-500 border-white text-black' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
          >
            {i + 1}번 {p.nickname}
          </button>
        ))}
      </div>
      <button 
        onClick={() => { onAction('RESOLVE_WINNERS', { winnerUserIds: winners }); setWinners([]); }}
        className="bg-amber-600 h-14 rounded-xl font-black text-white"
      >
        CONFIRM WINNERS ({winners.length})
      </button>
      <button 
        onClick={() => { onAction('START_PRE_FLOP')}}
        className="bg-amber-600 h-14 rounded-xl font-black text-white"
      >
        START_PRE_FLOP
      </button>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={() => onAction('DEALER_FOLD')} className="bg-orange-900 py-3 rounded-lg text-[10px] font-bold">FORCE FOLD</button>
        <button onClick={() => onAction('DEALER_KICK')} className="bg-black py-3 rounded-lg text-[10px] font-bold">KICK</button>
      </div>
    </div>
  );
}