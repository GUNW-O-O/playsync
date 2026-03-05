import { Resolver, Mutation, Args, ObjectType, Field } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginUserDto } from 'shared/dto/user.dto';

@ObjectType()
class AuthResponse {
  @Field()
  accessToken: string;

  @Field(() => String, { nullable: true })
  refreshToken?: string;
}

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
  ) { }

  // 1. 일반 유저 회원가입
  @Mutation()
  async register(@Args('dto') dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  // 2. 일반 유저 및 점주 로그인
  @Mutation(() => AuthResponse)
  async login(@Args('input') input: LoginUserDto) {
    // 기존에 만드신 LoginUserDto 대신 RegisterInput(혹은 LoginInput) 사용
    return this.authService.login(input);
  }
}