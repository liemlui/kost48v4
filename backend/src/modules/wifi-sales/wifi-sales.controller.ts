import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateWifiSaleDto, UpdateWifiSaleDto } from './dto/wifi-sale.dto';
import { WifiSalesQueryDto } from './dto/wifi-sales-query.dto';
import { WifiSalesService } from './wifi-sales.service';

@ApiTags('wifi-sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wifi-sales')
export class WifiSalesController {
  constructor(private readonly wifisalesService: WifiSalesService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: WifiSalesQueryDto) {
    return { message: 'Daftar penjualan WiFi berhasil diambil', data: await this.wifisalesService.findAll(query) };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail penjualan WiFi berhasil diambil', data: await this.wifisalesService.findOne(id) };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async create(@Body() dto: CreateWifiSaleDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Penjualan WiFi berhasil dicatat', data: await this.wifisalesService.create(dto, user) };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWifiSaleDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Penjualan WiFi berhasil diperbarui', data: await this.wifisalesService.update(id, dto, user) };
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Penjualan WiFi berhasil dihapus', data: await this.wifisalesService.remove(id, user) };
  }

}
