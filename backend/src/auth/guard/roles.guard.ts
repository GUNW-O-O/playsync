import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorator/roles.decorator';
import { UserService } from 'src/user/user.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService, // 유저 확인을 위해 주입
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. 데코레이터(@Roles)에 적힌 '필요한 롤' 가져오기 (예: ['STORE_ADMIN'])
    const requiredRoles = this.reflector.get<Role[]>(ROLES_KEY, context.getHandler());
    if (!requiredRoles) return true;

    // 2. 요청 객체(Header 등)에서 UUID 꺼내기
    const request = context.switchToHttp().getRequest();
    const uuid = request.headers['userId']; // 프론트가 보낸 UUID
    if(!uuid || typeof uuid !== 'string') {
      throw new ForbiddenException('인증을 위한 UUID가 존재하지 않습니다.')
    }

    // 3. 매핑: UUID로 DB에서 실제 유저의 Role을 가져옴
    const user = await this.userService.findByUUID(uuid);
    if (!user) throw new ForbiddenException(`권한이 없습니다 ${requiredRoles.join(', ')}`);

    // 4. 검사: 유저의 Role이 필요한 Role에 포함되는지 확인
    return requiredRoles.includes(user.role);
  }
}