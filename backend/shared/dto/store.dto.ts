import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType()
export class CreateStoreDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  storeName: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @IsString()
  ownerId: string;
}

export class UpdateStoreDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  storeName: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @IsString()
  ownerId: string;
}
