import { IsString, Max, Min } from "class-validator";

export class KioskPayMentDto {

  @IsString()
  userId: string;

  @IsString()
  tableId: string;

  @IsString()
  @Min(0)
  @Max(8)
  seatIndex: number;

}

export class RebuyDto {
  @IsString()
  userId: string;

  @IsString()
  tableId: string;

}