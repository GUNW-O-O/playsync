import { Role } from "@prisma/client";

export interface JwtPayLoad {
  sub: string;
  nickname: string;
  role: Role;
}