import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import {
  AssignTicketDto,
  CloseTicketDto,
  CreateBackofficeTicketDto,
  CreatePortalTicketDto,
  ResolutionDto,
} from './dto/ticket.dto';
import { TicketsQueryDto } from './dto/tickets-query.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: TicketsQueryDto) {
    return { message: 'Daftar tiket berhasil diambil', data: await this.ticketsService.findAll(query) };
  }

  @Get('my')
  @Roles(UserRole.TENANT)
  async findMine(@CurrentUser() user: CurrentUserPayload, @Query() query: TicketsQueryDto) {
    return { message: 'Daftar tiket saya berhasil diambil', data: await this.ticketsService.findMine(user, query) };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail tiket berhasil diambil', data: await this.ticketsService.findOne(id, user) };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async create(@Body() dto: CreateBackofficeTicketDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil dibuat', data: await this.ticketsService.createBackoffice(dto, user) };
  }

  @Post('portal')
  @Roles(UserRole.TENANT)
  async createPortal(@Body() dto: CreatePortalTicketDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil dibuat', data: await this.ticketsService.createPortal(dto, user) };
  }

  @Post(':id/assign')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignTicketDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil di-assign', data: await this.ticketsService.assign(id, dto, user) };
  }

  @Post(':id/start')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async start(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil diproses', data: await this.ticketsService.start(id, user) };
  }

  @Post(':id/mark-done')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async markDone(@Param('id', ParseIntPipe) id: number, @Body() dto: ResolutionDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil ditandai selesai', data: await this.ticketsService.markDone(id, dto, user) };
  }

  @Post(':id/close')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async close(@Param('id', ParseIntPipe) id: number, @Body() dto: CloseTicketDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Status tiket berhasil diperbarui', data: await this.ticketsService.close(id, dto, user) };
  }
}
