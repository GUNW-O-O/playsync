// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    // REST와 GQL 공통 대응을 위해 request 추출
    const request = context.getType() === 'http' 
      ? context.switchToHttp().getRequest() 
      : GqlExecutionContext.create(context).getContext().req;

    const user = request.user;
    return requiredRoles.some((role) => user.role === role);
  }
}