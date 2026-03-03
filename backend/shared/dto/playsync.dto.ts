import { ActionType } from "src/game-engine/types";

export class PlayerActionDto {
  tableId: string;
  userId: string;
  action: ActionType;
  amount?: number;
}