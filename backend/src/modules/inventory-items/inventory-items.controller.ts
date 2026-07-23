import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateInventoryItemDto, StaffUpdateInventoryItemStatusDto, UpdateInventoryItemDto } from './dto/inventory-item.dto';
import { InventoryItemsQueryDto } from './dto/inventory-items-query.dto';
import { InventoryItemsService } from './inventory-items.service';

@ApiTags('inventory-items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory-items')
export class InventoryItemsController {
  constructor(private readonly inventoryitemsService: InventoryItemsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Ringkasan inventaris — OWNER/ADMIN/STAFF' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async summary() {
    return { message: 'Ringkasan inventaris berhasil diambil', data: await this.inventoryitemsService.getSummary() };
  }

  @Get()
  @ApiOperation({ summary: 'Daftar item inventory — OWNER/ADMIN/STAFF' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: InventoryItemsQueryDto) {
    return { message: 'Daftar item inventory berhasil diambil', data: await this.inventoryitemsService.findAll(query) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail item inventory — OWNER/ADMIN/STAFF' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail item inventory berhasil diambil', data: await this.inventoryitemsService.findOne(id) };
  }

  @Post()
  @ApiOperation({ summary: 'Buat item inventory — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async create(@Body() dto: CreateInventoryItemDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Item inventory berhasil dibuat', data: await this.inventoryitemsService.create(dto, user) };
  }



  @Patch(':id/staff-status')
  @ApiOperation({ summary: 'Laporan kondisi barang gudang — STAFF/OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async updateStaffStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: StaffUpdateInventoryItemStatusDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Laporan kondisi barang gudang diterima dan menunggu konfirmasi admin', data: await this.inventoryitemsService.updateStatusFromField(id, dto, user) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Perbarui item inventory — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInventoryItemDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Item inventory berhasil diperbarui', data: await this.inventoryitemsService.update(id, dto, user) };
  }

}
