import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CancelInvoiceDto, CreateInvoiceDto, CreateInvoiceLineDto, UpdateInvoiceDto, UpdateInvoiceLineDto } from './dto/invoice.dto';
import { InvoicesQueryDto } from './dto/invoices-query.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: InvoicesQueryDto) {
    return { message: 'Daftar invoice berhasil diambil', data: await this.invoicesService.findAll(query) };
  }

  @Get('my')
  @Roles(UserRole.TENANT)
  async mine(@CurrentUser() user: CurrentUserPayload, @Query() query: InvoicesQueryDto) {
    return { message: 'Daftar invoice saya berhasil diambil', data: await this.invoicesService.findMine(user, query) };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail invoice berhasil diambil', data: await this.invoicesService.findOne(id, user) };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Invoice draft berhasil dibuat', data: await this.invoicesService.create(dto, user) };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInvoiceDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Invoice berhasil diperbarui', data: await this.invoicesService.update(id, dto, user) };
  }

  @Post(':id/lines')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async addLine(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateInvoiceLineDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail invoice berhasil ditambahkan', data: await this.invoicesService.addLine(id, dto, user) };
  }

  @Patch(':id/lines/:lineId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async updateLine(@Param('id', ParseIntPipe) id: number, @Param('lineId', ParseIntPipe) lineId: number, @Body() dto: UpdateInvoiceLineDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail invoice berhasil diperbarui', data: await this.invoicesService.updateLine(id, lineId, dto, user) };
  }

  @Delete(':id/lines/:lineId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async removeLine(@Param('id', ParseIntPipe) id: number, @Param('lineId', ParseIntPipe) lineId: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail invoice berhasil dihapus', data: await this.invoicesService.removeLine(id, lineId, user) };
  }

  @Post(':id/issue')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async issue(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Invoice berhasil diterbitkan', data: await this.invoicesService.issue(id, user) };
  }

  @Post(':id/cancel')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelInvoiceDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Invoice berhasil dibatalkan', data: await this.invoicesService.cancel(id, dto, user) };
  }
}
