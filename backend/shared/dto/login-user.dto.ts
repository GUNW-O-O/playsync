import { IsString, MinLength } from 'class-validator';

export class LoginUserDto {
  @IsString()
  nickname: string;

  @IsString()
  @MinLength(6)
  password: string;
}