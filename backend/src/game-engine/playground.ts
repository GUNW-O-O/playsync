import { HandState, GamePhase, ActionType } from "./types";
import { TableEngine } from "./table-engine";

// 초기 상태 생성
const state: HandState = {
  phase: GamePhase.PRE_FLOP,
  buttonIndex: 0,
  currentTurnIndex: 1,
  pot: 0,
  currentBet: 50,
  players: [
    { id: "A", stack: 1000, bet: 50, hasFolded: false, isAllIn: false },
    { id: "B", stack: 1000, bet: 50, hasFolded: false, isAllIn: false },
    { id: "C", stack: 1000, bet: 50, hasFolded: false, isAllIn: false },
  ]
};

const engine = new TableEngine(state);
