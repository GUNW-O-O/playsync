import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@prisma/client';
import { JwtPayLoad } from 'shared/types/jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret', // 환경변수 관리 필수
    });
  }

  async validate(payload: JwtPayLoad) {
    // 토큰의 페이로드에서 유저 정보를 반환 (req.user에 저장됨)
    return { 
      userId: payload.sub, 
      nickname: payload.nickname, 
      role: payload.role as Role 
    };
  }
}