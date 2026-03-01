import { IsInt, IsString } from "class-validator";

export class DealerDto {

  @IsString()
  physicalTableId: string;

  @IsString()
  sessionId: string;

  @IsInt()
  otp: number;

}