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
  RAISE,
  DEALER_KICK,
  DEALER_FOLD
}

export type ActionInput = {
  type : ActionType;
}

export interface EnginePlayer {
  id : string;
  userId: string;
  nickname: string;
  stack : number;
  bet : number;
  hasFolded : boolean;
  isAllIn : boolean;
}

export interface HandState {
  phase : GamePhase;
  players : (EnginePlayer | null)[];
  buttonIndex : number;
  currentTurnIndex : number;
  pot : number;
  sidePots: SidePot[];
  currentBet : number;
  minRaise : number;
  ante : number;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}