import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'shared/dto/create-user';
import { LoginUserDto } from 'shared/dto/login-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService : AuthService) {};

  @Post('signup')
  @UsePipes(new ValidationPipe({ whitelist : true }))
  async signup(@Body() dto : CreateUserDto) {
    const user = await this.authService.signup(dto);
    return { id : user.id, nickname : user.nickname };
  }

  @Post('signin')
  @UsePipes(new ValidationPipe({ whitelist : true }))
  async signin(@Body() dto : LoginUserDto) {
    return this.authService.signin(dto);
  }
}
