import { IsInt, IsString } from "class-validator";

export class DealerDto {

  @IsString()
  tournamentId: string;

  @IsInt()
  otp: number;

}