import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from 'shared/dto/create-user.dto';
import { LoginUserDto } from 'shared/dto/login-user.dto';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';


@Injectable()
export class AuthService {
  constructor(private userService: UserService) {};

  async signup(dto : CreateUserDto) {
    return this.userService.createUser(dto.nickname, dto.password);
  }

  async signin(dto : LoginUserDto) {
    const user = await this.userService.findByNickname(dto.nickname);
    if(!user) throw new UnauthorizedException('비밀번호나 닉네임이 틀렸습니다.');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('비밀번호나 닉네임이 틀렸습니다.')
    
    return { id : user.id, nickname : user.nickname };
  }

  async signinStoreAdmin(dto: CreateUserDto) {
    return this.userService.createStoreAdmin(dto.nickname, dto.password);
  }
}
