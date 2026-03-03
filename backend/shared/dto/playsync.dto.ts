import { ActionType } from "src/game-engine/types";

export class PlayerActionDto {
  sessionId: string;
  userId: string;
  action: ActionType;
  amount?: number;
}