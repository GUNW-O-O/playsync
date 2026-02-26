import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  nickname: string;

  @IsString()
  @MinLength(6)
  password: string;
}