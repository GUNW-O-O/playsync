import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CreateStoreDto, UpdateStoreDto } from 'shared/dto/store.dto';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { StoreService } from './store.service';

@Controller('store')
@UseGuards(RolesGuard)
@Roles(Role.STORE_ADMIN, Role.PLATFORM_ADMIN)
export class StoreController {
  constructor(private storeService: StoreService) { };

  @Post()
  async createStore(@Body() dto: CreateStoreDto) {
    return this.storeService.createStore(dto);
  }

  @Get(':ownerId')
  async getUserStores(@Param('ownerId') ownerId: string) {
    return this.storeService.getUserStores(ownerId);
  }

  @Get(':ownerId/:id')
  async getStoreDetail(@Param('id') id: string, @Param('ownerId') ownerId: string) {
    return this.storeService.getStoreDetail(id, ownerId);
  }

  @Put(':id')
  async updateStore(@Param('id') id: string, @Body() dto: UpdateStoreDto) {
    return this.storeService.updateStore(id, dto);
  }

  @Delete(':ownerId/:id')
  async removeStore(@Param('id') id: string, @Param('ownerId') ownerId: string) {
    return this.storeService.removeStore(id, ownerId);
  }

}