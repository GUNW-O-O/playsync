import { IsString } from "class-validator";

export class KioskPayMentDto {

  @IsString()
  userId: string;

  @IsString()
  sessionId: string;

  @IsString()
  tableId: string;

  @IsString()
  seatIndex: number;

}
