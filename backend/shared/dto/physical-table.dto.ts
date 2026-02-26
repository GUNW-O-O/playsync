import { IsInt, Max, Min } from "class-validator";

export class CreatePhysicalTableDto {
  @IsInt()
  @Min(1)
  number: number; // 테이블 번호 (예: 1번 테이블)

  @IsInt()
  @Min(2)
  @Max(10)
  seatCount: number; // 최대 좌석 수
}