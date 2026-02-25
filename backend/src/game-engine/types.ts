export enum GamePhase {
  WAITING,
  PRE_FLOP,
  FLOP,
  TURN,
  RIVER,
  SHOWDOWN,
  HAND_END,
  OUT
}

export enum ActionType {
  CHECK,
  CALL,
  FOLD,
  ALL_IN,
  RAISE
}

export type ActionInput = {
  type : ActionType;
}

export interface EnginePlayer {
  id : string;
  stack : number;
  bet : number;
  hasFolded : boolean;
  isAllIn : boolean;
}

export interface HandState {
  phase : GamePhase;
  players : EnginePlayer[];
  buttonIndex : number;
  currentTurnIndex : number;
  pot : number;
  currentBet : number;
}