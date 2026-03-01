// src/session/dto/create-session.dto.ts
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { SessionType } from '@prisma/client';

export class CreateSessionDto {
  @IsString()
  name: string;

  @IsEnum(SessionType)
  type: SessionType;

  @IsString({ each: true })
  tableIds: string[];

  @IsString()
  storeId: string;

  @IsString()
  @IsOptional()
  blindId?: string;

  @IsInt()
  @Min(0)
  avgStack: number;

  @IsInt()
  @Min(0)
  startStack: number;

  @IsInt()
  @Min(0)
  rebuyUntil: number;

  // --- Tournament 전용 필드 ---
  @ValidateIf((o) => o.type === SessionType.TOURNAMENT)
  @IsInt()
  @Min(1)
  maxTables: number;

  // --- SitAndGo 전용 필드 ---
  @ValidateIf((o) => o.type === SessionType.SIT_AND_GO)
  @IsInt()
  @Min(4)
  minPlayers: number;
}

export class UpdateSessionDto {

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @IsOptional()
  blindId?: string;

  // 토너먼트 전용
  @IsInt()
  @Min(0)
  rebuyUntil: number;

}