import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    // GraphQL 요청인 경우 컨텍스트를 변환하여 request 객체 추출
    if (context.getType<any>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      return ctx.getContext().req;
    }
    // 일반 HTTP 요청인 경우 그대로 반환
    return context.switchToHttp().getRequest();
  }
}