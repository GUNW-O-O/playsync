import { IsString, Max, Min } from "class-validator";

export class PayMentDto {

  @IsString()
  tournamentId: string;

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