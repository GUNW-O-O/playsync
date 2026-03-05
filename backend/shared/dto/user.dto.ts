import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class LoginUserDto {
  
  @Field()
  @IsNotEmpty()
  @IsString()
  nickname: string;
  
  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}

@InputType()
export class CreateUserDto {
  
  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(10)
  nickname: string;
  
  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}