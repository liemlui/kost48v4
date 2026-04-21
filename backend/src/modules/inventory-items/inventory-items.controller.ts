import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateInventoryItemDto, UpdateInventoryItemDto } from './dto/inventory-item.dto';
import { InventoryItemsQueryDto } from './dto/inventory-items-query.dto';
import { InventoryItemsService } from './inventory-items.service';

@ApiTags('inventory-items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory-items')
export class InventoryItemsController {
  constructor(private readonly inventoryitemsService: InventoryItemsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: InventoryItemsQueryDto) {
    return { message: 'Daftar item inventory berhasil diambil', data: await this.inventoryitemsService.findAll(query) };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail item inventory berhasil diambil', data: await this.inventoryitemsService.findOne(id) };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async create(@Body() dto: CreateInventoryItemDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Item inventory berhasil dibuat', data: await this.inventoryitemsService.create(dto, user) };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInventoryItemDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Item inventory berhasil diperbarui', data: await this.inventoryitemsService.update(id, dto, user) };
  }

}
