import { BlindLevelDto } from "shared/dto/blind-structure.dto";

export interface Dashboard {
  isRegistrationOpen: boolean,
  totalPlayer: number,
  activePlayer: number,
  totalBuyinAmount: number,
  rebuyUntil: number,
  avgStack: number
}

export interface BlindField {
  isBreak: boolean,
  startedAt: Date,
  currentBlindLv: number,
  nextLevelAt: Date,
  serverTime: Date,
  blindStructure: BlindLevelDto[],
}