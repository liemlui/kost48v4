import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateInventoryMovementDto, UpdateInventoryMovementDto } from './dto/inventory-movement.dto';
import { InventoryMovementsQueryDto } from './dto/inventory-movements-query.dto';
import { InventoryMovementsService } from './inventory-movements.service';

@ApiTags('inventory-movements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory-movements')
export class InventoryMovementsController {
  constructor(private readonly inventoryMovementsService: InventoryMovementsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: InventoryMovementsQueryDto) {
    return { message: 'Daftar pergerakan inventory berhasil diambil', data: await this.inventoryMovementsService.findAll(query) };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail pergerakan inventory berhasil diambil', data: await this.inventoryMovementsService.findOne(id) };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async create(@Body() dto: CreateInventoryMovementDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pergerakan inventory berhasil dicatat', data: await this.inventoryMovementsService.create(dto, user) };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInventoryMovementDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pergerakan inventory berhasil diperbarui', data: await this.inventoryMovementsService.update(id, dto, user) };
  }
}
