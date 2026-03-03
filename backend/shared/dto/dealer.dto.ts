import { IsInt, IsString } from "class-validator";

export class DealerDto {

  @IsString()
  sessionId: string;

  @IsInt()
  otp: number;

}