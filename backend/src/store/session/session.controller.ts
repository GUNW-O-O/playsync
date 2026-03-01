// src/store/session/session.controller.ts
import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { SessionService } from './session.service';
import { CreateSessionDto, UpdateSessionDto } from 'shared/dto/session.dto';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorator/roles.decorator';

@UseGuards(RolesGuard)
@Roles(Role.STORE_ADMIN, Role.PLATFORM_ADMIN)
@Controller('store/sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  async create(@Body() dto: CreateSessionDto) {
    return this.sessionService.createSession(dto);
  }

  @Get(':storeId')
  async findAll(@Param('storeId') storeId: string) {
    return this.sessionService.getStoreAllSessions(storeId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessionService.updateSession(id, dto);
  }

  @Patch(':id/start')
  async start(@Param('id') id: string) {
    return this.sessionService.startSession(id);
  }

  @Patch(':id/complete')
  async complete(@Param('id') id: string) {
    return this.sessionService.completeSession(id);
  }
}