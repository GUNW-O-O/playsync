// /src/session/dto/blind-structure.dto.ts
import { IsString, IsArray, IsNotEmpty, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BlindLevelDto {
  @IsInt()
  @Min(1)
  lv: number;

  @IsInt()
  @Min(0)
  sb: number;

  @IsInt()
  @Min(0)
  ante: number;

  @IsInt()
  @Min(10)
  duration: number; // 분 단위
}

export class CreateBlindStructureDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlindLevelDto)
  structure: BlindLevelDto[]; // prisma의 Json 타입 대응 

  @IsString()
  @IsNotEmpty()
  storeId: string;
}