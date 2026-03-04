import { BlindLevelDto } from "shared/dto/blind-structure.dto";

export enum GamePhase {
  WAITING,
  PRE_FLOP,
  FLOP,
  TURN,
  RIVER,
  SHOWDOWN,
  HAND_END
}

export enum ActionType {
  CHECK,
  CALL,
  FOLD,
  RAISE,
  TIME_OUT,
  DEALER_KICK,
  DEALER_FOLD,
}

// export type ActionInput = {
//   type : ActionType;
// }

export interface TablePlayer {
  id: string;
  tableId: string;
  nickName: string;
  seatIndex: number;
  stack: number;
  bet: number;
  hasFolded: boolean;
  isAllIn: boolean;
  button: boolean;
  totalContributed: number;
}

export interface TableState {
  phase: GamePhase;
  players: (TablePlayer | null)[];
  buttonUser: number;
  currentTurnSeatIndex: number;
  lastRaiserIndex: number;
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  ante: boolean;
  actionDeadline?: number;
}

export interface SidePot {
  amount: number;
  relevantPlayerIds: string[];
}