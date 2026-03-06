import { Field, Int, ObjectType } from "@nestjs/graphql";
import { GameType } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsString, Min } from "class-validator";

@ObjectType()
export class AdminTournament {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsEnum(GameType)
  type: GameType;

  @Field()
  @IsString()
  storeId: string;

  @Field()
  @IsString()
  blindId: string;

  @Field()
  @IsInt()
  @Min(0)
  startStack: number;

  @Field()
  @IsInt()
  @Min(0)
  entryFee: number;

  @Field()
  @IsInt()
  @Min(0)
  rebuyUntil: number;

  @Field()
  @IsInt()
  @Min(0)
  itmCount: number;

  @Field()
  @IsBoolean()
  isRegistrationOpen: boolean;

  @Field(() => Int, { nullable: true })
  @IsInt()
  dealerOtp: number;
}
@ObjectType()
export class UserTournament {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsEnum(GameType)
  type: GameType;

  @Field()
  @IsString()
  storeId: string;

  @Field()
  @IsString()
  blindId: string;

  @Field()
  @IsInt()
  @Min(0)
  startStack: number;

  @Field()
  @IsInt()
  @Min(0)
  entryFee: number;

  @Field()
  @IsInt()
  @Min(0)
  rebuyUntil: number;

  @Field()
  @IsInt()
  @Min(0)
  itmCount: number;

  @Field()
  @IsBoolean()
  isRegistrationOpen: boolean;
}