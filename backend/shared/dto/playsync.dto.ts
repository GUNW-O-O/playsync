import { ActionType } from "src/game-engine/types";

export class PlayerActionDto {
  sessionId: string;
  tableId: string;
  userId: string;
  action: ActionType;
  amount?: number;
}