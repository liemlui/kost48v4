import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CancelStayDto, CompleteStayDto, CreateStayDto, ProcessDepositDto, RenewStayDto, UpdateStayDto } from './dto/stay.dto';
import { StaysQueryDto } from './dto/stays-query.dto';
import { StaysService } from './stays.service';

@ApiTags('stays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stays')
export class StaysController {
  constructor(private readonly staysService: StaysService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: StaysQueryDto) {
    return { message: 'Daftar stay berhasil diambil', data: await this.staysService.findAll(query) };
  }

  @Get('me/current')
  @Roles(UserRole.TENANT)
  async meCurrent(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay aktif berhasil diambil', data: await this.staysService.findCurrentForTenant(user) };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async create(@Body() dto: CreateStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil dibuat', data: await this.staysService.create(dto, user) };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail stay berhasil diambil', data: await this.staysService.findOne(id, user) };
  }

  @Get(':id/invoice-suggestion')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async getInvoiceSuggestion(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Saran invoice berhasil diambil',
      data: await this.staysService.getInvoiceSuggestion(id, user),
    };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil diperbarui', data: await this.staysService.update(id, dto, user) };
  }

  @Post(':id/complete')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async complete(@Param('id', ParseIntPipe) id: number, @Body() dto: CompleteStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil diselesaikan', data: await this.staysService.complete(id, dto, user) };
  }

  @Post(':id/cancel')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil dibatalkan', data: await this.staysService.cancel(id, dto, user) };
  }

  @Post(':id/deposit/process')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async processDeposit(@Param('id', ParseIntPipe) id: number, @Body() dto: ProcessDepositDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Deposit berhasil diproses', data: await this.staysService.processDeposit(id, dto, user) };
  }

  @Post(':id/renew')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async renewStay(@Param('id', ParseIntPipe) id: number, @Body() dto: RenewStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil diperpanjang', data: await this.staysService.renewStay(id, dto, user) };
  }
}
