import { ActionType } from "@/app/types/game";
import ActionTimer from "@/component/ActionTimer";
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
  const bigBlind = state.currentBet;
  const [raiseVal, setRaiseVal] = useState(bigBlind * 2);
  const myPlayer = state.players[mySeatIndex];
  const currentInPot = myPlayer?.bet || 0;
  const needsToCall = state.currentBet - currentInPot;
  const canCheck = needsToCall === 0;


  if (state.phase === 5) {
    return <div className="flex-1 flex items-center justify-center text-slate-500 font-bold italic animate-pulse">핸드결과 대기 중...</div>;
  }
  if (state.currentTurnSeatIndex === -1 || state.phase === 0) {
    return <div className="flex-1 flex items-center justify-center text-slate-500 font-bold italic animate-pulse">게임시작 대기 중...</div>;
  }
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
          <button onClick={() => setRaiseVal(Math.min(state.smallBlind * 4, myPlayer?.stack))} className="bg-slate-800 py-1 rounded text-[10px] font-bold hover:bg-indigo-600">
            2BB
          </button>
          {[0.3, 0.5, 1].map(p => (
            <button key={p} onClick={() => setRaiseVal(Math.min(Math.round(state.pot * p), myPlayer?.stack))} className="bg-slate-800 py-1 rounded text-[10px] font-bold hover:bg-indigo-600">
              {p * 100}%
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div></div>
        <button onClick={() => onAction('PLAYER_ACTION', { action: ActionType.RAISE, amount: myPlayer?.stack })} className="h-14 bg-indigo-700 rounded-xl font-black">ALLIN</button>
        <button onClick={() => onAction('PLAYER_ACTION', { action: ActionType.RAISE, amount: raiseVal })} className="h-14 bg-indigo-700 rounded-xl font-black">RAISE/BET</button>
        <button
          disabled={needsToCall === 0 && state.currentBet !== 0}
          onClick={() => onAction('PLAYER_ACTION', { action: ActionType.CALL, amount: state.currentBet })}
          className="h-14 bg-blue-700 rounded-xl font-black"
        >
          {needsToCall > 0 ? `CALL (${needsToCall.toLocaleString()})` : 'CALL'}
        </button>
        <button onClick={() => onAction('PLAYER_ACTION', { action: ActionType.FOLD })} className="h-14 bg-red-700 rounded-xl font-black">FOLD</button>
        <button
          disabled={!canCheck}
          onClick={() => onAction('PLAYER_ACTION', { action: ActionType.CHECK })}
          className={`h-14 rounded-xl font-black ${canCheck ? 'bg-slate-700' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}
        >
          CHECK
        </button>
      </div>
      {state.actionDeadline && (
        <div className="mt-2 space-y-1">
          <ActionTimer deadline={state.actionDeadline} />
          <p className="text-[9px] text-center text-slate-600 font-bold tracking-tighter uppercase">Remaining Decision Time</p>
        </div>
      )}
    </div>
  );
}

// 딜러 섹션 (승자 선택 포함)
function DealerSection({ state, onAction }: any) {
  const [winners, setWinners] = useState<string[]>([]);

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
      {(state.phase === 5 || state.phase === 6) ? (
        <button
          onClick={() => { onAction('DEALER_ACTION', { action: 'RESOLVE_WINNERS', winnerUserIds: winners }); setWinners([]); }}
          className="bg-amber-600 h-14 rounded-xl font-black text-white"
        >
          CONFIRM WINNERS ({winners.length})
        </button>
      ) : (
        <></>
      )}
      {state.phase === 0 ? (
        <button
          onClick={() => { onAction('DEALER_ACTION', { action: 'START_PRE_FLOP' }) }}
          className="bg-emerald-600 h-14 rounded-xl font-black text-white"
        >
          START_PRE_FLOP
        </button>
      ) : (<></>)}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={() => { onAction('DEALER_ACTION', { action: ActionType.DEALER_FOLD, targetUserIdx: winners[0] }); setWinners([]); }} className="bg-orange-900 py-3 rounded-lg text-[10px] font-bold">FORCE FOLD</button>
        <button onClick={() => { onAction('DEALER_ACTION', { action: ActionType.DEALER_KICK, targetUserIdx: winners[0] }); setWinners([]); }} className="bg-black py-3 rounded-lg text-[10px] font-bold">KICK</button>
      </div>
    </div>
  );
}