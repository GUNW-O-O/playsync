import { UseGuards } from "@nestjs/common";
import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { Role } from "@prisma/client";
import { Roles } from "src/auth/decorator/roles.decorator";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth.guard";
import { RolesGuard } from "src/auth/guard/roles.guard";
import { Store } from "./store.model";
import { StoreService } from "./store.service";
import { CreateStoreDto } from "shared/dto/store.dto";
import { SessionService } from "./session/session.service";
import { Tournament } from "./session/session.model";

@Resolver(() => Store)
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoreResolver {
  constructor(
    private readonly storeService: StoreService,
    private readonly sessionService: SessionService,
  ) { }

  // [Mutation] 상점 생성: 점주(STORE_ADMIN) 이상만 가능
  @Mutation(() => Store)
  @Roles(Role.STORE_ADMIN, Role.PLATFORM_ADMIN)
  async createStore(
    @Args('input') dto: CreateStoreDto,
    @Context() ctx,
  ) {
    // JWT에서 추출한 유저 ID를 소유자로 등록
    const ownerId = ctx.req.user.userId;
    return this.storeService.createStore(ownerId, dto);
  }

  // [Query] 내 상점 리스트 보기
  @Query(() => [Store], { name: 'myStores' })
  @Roles(Role.STORE_ADMIN, Role.PLATFORM_ADMIN)
  async getMyStores(@Context() ctx) {
    const ownerId = ctx.req.user.userId;
    return this.storeService.getUserStores(ownerId);
  }

  // [Query] 상점 관리
  @Query(() => Store, { name: 'store', nullable: true })
  @Roles(Role.STORE_ADMIN, Role.PLATFORM_ADMIN)
  async getStore(@Args('id') id: string, @Context() ctx) {
    const ownerId = ctx.req.user.userId;
    return this.storeService.getStoreDetail(id, ownerId);
  }

  // Store 타입 내의 tournaments 필드에 대한 별도 처리기
  @ResolveField(() => [Tournament])
  @UseGuards(JwtAuthGuard)
  async tournaments(@Parent() store: Store, @Context() ctx) {
    const user = ctx.req.user;
    const { id } = store;
    const data = await this.sessionService.getStoreAllSessions(id);
    if (user.rold === Role.USER) {
      return data.map(({ dealerOtp, ...rest }) => rest);
    }
    return data;
  }
}