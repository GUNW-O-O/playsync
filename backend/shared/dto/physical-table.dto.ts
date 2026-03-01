import { IsInt, Min } from "class-validator";

export class CreatePhysicalTableDto {
  @IsInt()
  @Min(1)
  number: number; // 테이블 번호 (예: 1번 테이블)
}