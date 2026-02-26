import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePhysicalTableDto } from 'shared/dto/physical-table.dto';
import { CreateStoreDto, UpdateStoreDto } from 'shared/dto/store.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) { };

  // 가맹점주 아이디의 가맹점들 조회
  async getUserStores(id: string) {
    return await this.prisma.store.findMany({
      where: { id },
    });
  }

  // 특정 가맹점 상세 조회
  async getStoreDetail(id: string, ownerId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: { physicalTables: true }
    });
    if (!store) throw new NotFoundException('일시적인 오류 혹은 가맹점 정보가 없습니다.');
    if (store.ownerId !== ownerId) throw new ForbiddenException('본인의 가맹점이 아닙니다.');

    return store;
  }

  async createStore(dto: CreateStoreDto) {
    return this.prisma.store.create({
      data: {
        name: dto.storeName,
        ownerId: dto.ownerId,
      }
    });
  }

  async updateStore(id: string, dto: UpdateStoreDto) {
    await this.getStoreDetail(id, dto.ownerId);
    return this.prisma.store.update({
      where: { id },
      data: { ...dto },
    });
  }

  async removeStore(id: string, ownerId: string) {
    await this.getStoreDetail(id, ownerId);
    return this.prisma.store.delete({ where: { id } });
  }

  // 테이블 소유 확인
  async isStoreOwnTable(storeId: string, tableId: string) {
    const table = await this.prisma.physicalTable.findUnique({
      where: { id: tableId },
    });
    if (!table) throw new NotFoundException('일시적인 오류 혹은 테이블 정보가 없습니다.');
    if (table.storeId !== storeId) throw new ForbiddenException('본인의 테이블이 아닙니다.');
    return table;
  }

  // 물리 테이블 생성
  async createPhysicalTable(storeId: string, dto: CreatePhysicalTableDto) {
    return await this.prisma.physicalTable.create({
      data: {
        number: dto.number,
        seatCount: dto.seatCount,
        storeId: storeId,
      }
    });
  }

  async updateTable(storeId: string, tableId: string, seatCount: number) {
    await this.isStoreOwnTable(storeId, tableId);
    return await this.prisma.physicalTable.update({
      where: { id: tableId },
      data: { seatCount },
    });
  }

  async deleteTable(storeId: string, tableId: string) {
    await this.isStoreOwnTable(storeId, tableId);
    return await this.prisma.physicalTable.delete({ where: { id: tableId } });
  }
}
