import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateRoomItemDto, StaffUpdateRoomItemStatusDto, UpdateRoomItemDto } from './dto/room-item.dto';
import { RoomItemsService } from './room-items.service';

@ApiTags('room-items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('room-items')
export class RoomItemsController {
  constructor(private readonly roomItemsService: RoomItemsService) {}

  @Get('my-room')
  @ApiOperation({ summary: 'Barang kamar saya — TENANT' })
  @Roles(UserRole.TENANT)
  async findMyRoomItems(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Daftar barang kamar kamu berhasil diambil', data: await this.roomItemsService.findMyRoomItems(user) };
  }

  @Get()
  @ApiOperation({ summary: 'Daftar room item — OWNER/ADMIN/STAFF' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query('roomId') roomId?: string) {
    return { message: 'Daftar room item berhasil diambil', data: await this.roomItemsService.findAll(roomId ? Number(roomId) : undefined) };
  }

  @Post()
  @ApiOperation({ summary: 'Buat room item — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async create(@Body() dto: CreateRoomItemDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Room item berhasil dibuat', data: await this.roomItemsService.create(dto, user) };
  }



  @Patch(':id/staff-status')
  @ApiOperation({ summary: 'Laporan kondisi barang kamar — STAFF/OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async updateStaffStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: StaffUpdateRoomItemStatusDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Laporan kondisi barang kamar diterima dan menunggu konfirmasi admin', data: await this.roomItemsService.updateStatusFromField(id, dto, user) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Perbarui room item — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoomItemDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Room item berhasil diperbarui', data: await this.roomItemsService.update(id, dto, user) };
  }
}
