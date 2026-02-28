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
  ALL_IN,
  BET,
  RAISE,
  DEALER_KICK,
  DEALER_FOLD,
  ELIMINATED
}

export type ActionInput = {
  type : ActionType;
}

export interface TablePlayer {
  id : string;
  userId: string;
  stack : number;
  bet : number;
  hasFolded : boolean;
  isAllIn : boolean;
  button : boolean;
}

export interface TableState {
  phase : GamePhase;
  players : (TablePlayer | null)[];
  buttonUser : number;
  currentTurnSeatIndex : number;
  pot : number;
  sidePots: SidePot[];
  currentBet : number;
  ante : number;
}

export interface SidePot {
  amount: number;
  relevantPlayerIds: string[];
}